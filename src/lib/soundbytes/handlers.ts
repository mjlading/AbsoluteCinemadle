import "server-only";

import { z } from "zod";

import { bytesResponse, errorResponse, parseJsonBody } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb/images";
import { getClip } from "./source";
import type {
  Clip,
  PublicSoundbytesBoard,
  SoundbytesAnswer,
  SoundbytesBoard,
  SoundbytesGuessResult,
  StoredClip,
} from "./types";

/*
 * Request handling for /api/soundbytes/... The client gets labels and
 * clip addresses (our own clip route, under opaque ids); the film, its cast and
 * where each clip came from stay here, and a guess only learns whether it was right, as with the other games.
 */

const noStore = { "Cache-Control": "no-store" };

const publicClip = (boardId: string, clip: StoredClip): Clip =>
  "url" in clip
    ? { url: clip.url, start: clip.start, seconds: clip.seconds }
    : {
        url: `/api/soundbytes/${encodeURIComponent(boardId)}/clips/${clip.id}`,
        seconds: clip.seconds,
        ...(clip.mouth ? { mouth: clip.mouth } : {}),
      };

export function toPublicBoard(board: SoundbytesBoard): PublicSoundbytesBoard {
  return {
    id: board.id,
    name: board.name,
    date: board.date,
    nodes: [...board.nodes]
      .sort((a, b) => a.slot - b.slot)
      .map((n) => ({
        // Listed field by field, so nothing server-only (the clip's source) can slip through.
        id: n.id,
        slot: n.slot,
        label: n.label,
        category: n.category,
        art: n.art,
        clip: publicClip(board.id, n.clip),
      })),
  };
}

const answerOf = (board: SoundbytesBoard): SoundbytesAnswer => ({
  title: board.answer.title,
  year: board.answer.year,
  posterUrl: posterUrl(board.answer.posterPath),
  themeUrl: board.answer.themeUrl,
});

export const boardResponse = (board: SoundbytesBoard) => Response.json(toPublicBoard(board), { headers: noStore });

const GuessBody = z.object({
  kind: z.enum(["film", "person"]),
  tmdbId: z.number().int().positive(),
});

export async function guessResponse(board: SoundbytesBoard, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  let result: SoundbytesGuessResult = { correct: false };
  if (body.kind === "film" && body.tmdbId === board.answer.tmdbId) {
    result = { correct: true, kind: "film", answer: answerOf(board) };
  } else if (body.kind === "person") {
    const actor = board.answer.cast.find((c) => c.tmdbId === body.tmdbId);
    if (actor) result = { correct: true, kind: "person", name: actor.name };
  }
  return Response.json(result, { headers: noStore });
}

/** The answer, for a lost or abandoned game. Calling it early only spoils the caller's own game. */
export const solutionResponse = (board: SoundbytesBoard) =>
  Response.json({ answer: answerOf(board) }, { headers: noStore });

/**
 * A dialogue clip's audio. Clip ids are random and change with every import, so the
 * browser may keep a clip for good; it stays out of shared caches (see bytesResponse).
 */
export async function clipResponse(boardId: string, clipId: string, request: Request): Promise<Response> {
  const clip = await getClip(boardId, clipId);
  if (!clip) return errorResponse(404, "That clip is not on this board.");
  return bytesResponse(request, clip.data, clip.contentType, "private, max-age=31536000, immutable");
}
