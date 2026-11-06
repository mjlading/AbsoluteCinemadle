import "server-only";

import { z } from "zod";

import { errorResponse, parseJsonBody } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb/images";
import { titleMatches } from "@/lib/warmup/match";
import { parseCollageView, renderCollageImage } from "./image";
import { unlockCost } from "./state";
import type { CollageAnswer, CollageGuessResult, CollagePuzzle, CollageSolution, PublicCollagePuzzle } from "./types";

/*
 * Request handling for /api/collage/[puzzleId]/... The client gets keyword
 * labels and opaque tile ids; the title only arrives with a right guess or
 * from the solution route, as with the daily puzzle.
 */

const noStore = { "Cache-Control": "no-store" };

export const collageApiBase = (puzzleId: string) => `/api/collage/${puzzleId}`;

const tileUrl = (puzzleId: string, tileId: string, view: string) =>
  `${collageApiBase(puzzleId)}/tiles/${tileId}/image${view === "crop" ? "" : `?view=${view}`}`;

export function toPublicCollage(puzzle: CollagePuzzle): PublicCollagePuzzle {
  return {
    id: puzzle.id,
    name: puzzle.name,
    keywords: puzzle.keywords.map((k) => ({
      id: k.id,
      label: k.label,
      tier: k.tier,
      cost: k.free ? 0 : unlockCost(k.tier),
      free: k.free,
      tiles: k.tiles.map((t, i) => ({
        id: t.id,
        number: i + 1,
        imageUrl: tileUrl(puzzle.id, t.id, "crop"),
        enhancedUrl: tileUrl(puzzle.id, t.id, "enhanced"),
      })),
    })),
  };
}

const answerOf = (puzzle: CollagePuzzle): CollageAnswer => ({
  title: puzzle.answer.title,
  year: puzzle.answer.year,
  posterUrl: posterUrl(puzzle.answer.posterPath),
});

export const collageResponse = (puzzle: CollagePuzzle) => Response.json(toPublicCollage(puzzle), { headers: noStore });

const GuessBody = z.object({
  guess: z.string().max(200),
  /** Set when the player picked a film from the suggestions. */
  tmdbId: z.number().int().positive().optional(),
});

export async function collageGuessResponse(puzzle: CollagePuzzle, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const correct =
    body.tmdbId === puzzle.answer.tmdbId ||
    titleMatches(body.guess, [puzzle.answer.title, puzzle.answer.originalTitle]);
  const result: CollageGuessResult = correct ? { correct: true, answer: answerOf(puzzle) } : { correct: false };
  return Response.json(result, { headers: noStore });
}

/** The answer and every tile's frame, for the end of the game. Calling it early only spoils the caller's own game. */
export function collageSolutionResponse(puzzle: CollagePuzzle): Response {
  const solution: CollageSolution = {
    answer: answerOf(puzzle),
    frames: puzzle.keywords.flatMap((k) =>
      k.tiles.map((t) => ({
        tileId: t.id,
        frameUrl: tileUrl(puzzle.id, t.id, "frame"),
        crop: t.image.kind === "tmdb" ? t.image.crop : { x: 0, y: 0, width: 1, height: 1 },
        aspect: t.frame.width / t.frame.height,
      })),
    ),
  };
  return Response.json(solution, { headers: noStore });
}

/** Tiles never change once exported (a new export makes new ids), so their pictures can be cached for 30 days. */
export async function collageImageResponse(puzzle: CollagePuzzle, tileId: string, request: Request): Promise<Response> {
  const tile = puzzle.keywords.flatMap((k) => k.tiles).find((t) => t.id === tileId);
  if (!tile) return errorResponse(404, "That tile is not in this puzzle.");
  try {
    const { body, contentType } = await renderCollageImage(
      tile,
      parseCollageView(new URL(request.url).searchParams.get("view")),
    );
    return new Response(body as BodyInit, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=2592000, immutable" },
    });
  } catch (error) {
    console.error(`Could not render collage tile ${tileId}`, error);
    return errorResponse(502, "The picture for this tile could not be loaded.");
  }
}
