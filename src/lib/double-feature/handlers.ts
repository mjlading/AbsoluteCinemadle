import "server-only";

import { z } from "zod";

import { errorResponse, parseJsonBody } from "@/lib/http";
import { getOrBuildPrototypeBoard, getPrototypeBoard, type PrototypeBoard } from "@/lib/prototypes/boards";
import { prototypeImageUrl } from "@/lib/prototypes/images";
import { doubleFeatureSpec, imageId, OPTION_IDS, type DoubleFeatureData } from "./board";
import { showsYear } from "./questions";
import type { DoubleFeatureReveal, PublicDoubleFeatureBoard, PublicOption } from "./types";

/*
 * Request handling for /api/double-feature/... The day route gives each round's
 * question and both films without the values asked about (or, in "came out first"
 * rounds, their years); the guess route reveals one round at a time.
 */

const noStore = { "Cache-Control": "no-store" };

type Board = PrototypeBoard<DoubleFeatureData>;

export function publicBoard(board: Board): PublicDoubleFeatureBoard {
  return {
    id: board.id,
    date: board.date,
    rounds: board.data.rounds.map((round, i) => ({
      kind: round.kind,
      options: round.films.map((film, side): PublicOption => ({
        id: OPTION_IDS[side],
        title: film.title,
        posterUrl: prototypeImageUrl(board.id, imageId(i, side as 0 | 1)),
        year: showsYear(round.kind) ? film.year : null,
      })) as [PublicOption, PublicOption],
    })),
  };
}

export async function dayResponse(date: string): Promise<Response> {
  try {
    const board = await getOrBuildPrototypeBoard(doubleFeatureSpec, date);
    if (!board) return errorResponse(404, "There is no Double Feature for that day.");
    return Response.json(publicBoard(board), { headers: noStore });
  } catch (error) {
    console.error(`Double Feature board for ${date} could not be built`, error);
    return errorResponse(502, "This day's board couldn't be made right now.");
  }
}

const GuessBody = z.object({ round: z.number().int().min(0), option: z.enum(OPTION_IDS) });

export function revealOf(board: Board, round: number): DoubleFeatureReveal | null {
  const r = board.data.rounds[round];
  if (!r) return null;
  return {
    correctOption: OPTION_IDS[r.correct],
    values: { [OPTION_IDS[0]]: r.films[0].display, [OPTION_IDS[1]]: r.films[1].display },
    years: { [OPTION_IDS[0]]: r.films[0].year, [OPTION_IDS[1]]: r.films[1].year },
  };
}

/** Reveals one round once the player has picked. */
export async function guessResponse(boardId: string, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const board = await getPrototypeBoard(doubleFeatureSpec, boardId);
  if (!board) return errorResponse(404, "There is no such board.");
  const reveal = revealOf(board, body.round);
  return reveal ? Response.json(reveal, { headers: noStore }) : errorResponse(404, "There is no such round.");
}
