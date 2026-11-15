import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { getDeepCutBoard, type DeepCutPrompt } from "./board";
import { checkFit } from "./criteria";
import { fame, percentRarerThan, rarityScore } from "./rarity";
import { getFilmRecord } from "./tmdb";
import type { DeepCutGuessResult, DeepCutReveal, PublicDeepCutBoard, RevealFilm } from "./types";

/*
 * Request handling for /api/deep-cut/... The client gets the prompts' text only;
 * the most obvious answer and the deep cut come with a fitting answer, or once a
 * prompt has run out of tries.
 */

const noStore = { "Cache-Control": "no-store" };

type Board = NonNullable<Awaited<ReturnType<typeof getDeepCutBoard>>>;

export async function boardOrErrorResponse(id: string): Promise<Board | Response> {
  return (await getDeepCutBoard(id)) ?? errorResponse(404, "There is no such board.");
}

export function boardResponse(board: Board): Response {
  const body: PublicDeepCutBoard = {
    id: board.id,
    date: board.date,
    prompts: board.data.prompts.map((p) => ({ text: p.text })),
  };
  return Response.json(body, { headers: noStore });
}

function revealOf(prompt: DeepCutPrompt): DeepCutReveal {
  const film = (f: DeepCutPrompt["mostObvious"]): RevealFilm => ({
    tmdbId: f.tmdbId,
    title: f.title,
    year: f.year,
    score: rarityScore(fame(f), prompt.scale.top),
  });
  return { mostObvious: film(prompt.mostObvious), deepCut: film(prompt.deepCut) };
}

const PromptIndex = z
  .number()
  .int()
  .min(0)
  .max(RULES.deepCut.rounds - 1);
const GuessBody = z.object({
  prompt: PromptIndex,
  tmdbId: z.number().int().positive(),
  /** Films that didn't fit this prompt so far, as the player's device counts them. */
  triesUsed: z.number().int().min(0).max(RULES.deepCut.triesPerPrompt).default(0),
});

export async function guessResponse(board: Board, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const prompt = board.data.prompts[body.prompt];
  try {
    const record = await getFilmRecord(body.tmdbId);
    const film = { tmdbId: record.tmdbId, title: record.title, year: record.year };
    const check = checkFit(prompt.criterion, record);
    let result: DeepCutGuessResult;
    if (!check.fits) {
      result = {
        fits: false,
        film,
        why: check.why,
        triesLeft: Math.max(0, RULES.deepCut.triesPerPrompt - body.triesUsed - 1),
      };
    } else {
      const f = fame(record);
      result = {
        fits: true,
        film,
        score: rarityScore(f, prompt.scale.top),
        percentile: percentRarerThan(f, prompt.scale),
        ...revealOf(prompt),
      };
    }
    return Response.json(result, { headers: noStore });
  } catch (error) {
    console.error("Deep Cut guess failed", error);
    return errorResponse(502, "That film couldn't be checked right now.");
  }
}

const RevealBody = z.object({ prompt: PromptIndex });

/** A prompt's answers once the player has run out of tries; asking early only spoils the asker's own game. */
export async function revealResponse(board: Board, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, RevealBody);
  if (body instanceof Response) return body;
  return Response.json(revealOf(board.data.prompts[body.prompt]), { headers: noStore });
}
