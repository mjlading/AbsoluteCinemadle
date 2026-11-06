import "server-only";

import { z } from "zod";

import { POINTS } from "@/config/scoring";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb/images";
import { getMockBoard, MOCK_BOARDS } from "./mock-boards";
import type { PublicSoundbytesBoard, SoundbytesAnswer, SoundbytesBoard, SoundbytesGuessResult } from "./types";

/*
 * Request handling for /api/soundbytes/... The client gets labels, prices and
 * clip addresses; the film and its cast stay here, and a guess only learns
 * whether it was right, as with the other games.
 */

const noStore = { "Cache-Control": "no-store" };

export function toPublicBoard(board: SoundbytesBoard): PublicSoundbytesBoard {
  return {
    id: board.id,
    name: board.name,
    nodes: [...board.nodes]
      .sort((a, b) => a.slot - b.slot)
      .map((n) => ({
        ...n,
        buyCost: n.free ? 0 : -POINTS.soundbytes.buy,
        revealCost: -POINTS.soundbytes.reveal,
      })),
  };
}

const answerOf = (board: SoundbytesBoard): SoundbytesAnswer => ({
  title: board.answer.title,
  year: board.answer.year,
  posterUrl: posterUrl(board.answer.posterPath),
});

export const listBoardsResponse = () =>
  Response.json({ boards: MOCK_BOARDS.map(({ id, name }) => ({ id, name })) }, { headers: noStore });

/** Loads the board for a route's id param, or the error response to return instead. */
export function boardOrErrorResponse(id: string): SoundbytesBoard | Response {
  return getMockBoard(id) ?? errorResponse(404, "There is no such board.");
}

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
