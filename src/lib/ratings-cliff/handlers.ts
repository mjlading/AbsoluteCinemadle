import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { getOrBuildPrototypeBoard, getPrototypeBoard, type PrototypeBoard } from "@/lib/prototypes/boards";
import { ratingsCliffSpec, type RatingsCliffBoardData } from "./board";
import { toPublicSeasons } from "./chart";
import type { PublicRatingsCliffBoard, RatingsCliffGuessResult } from "./types";

/*
 * Request handling for /api/ratings-cliff/... The client gets each round's
 * chart and option titles; which option is right, and the series' name, only
 * come back from the guess route, one round at a time.
 */

const noStore = { "Cache-Control": "no-store" };

type Board = PrototypeBoard<RatingsCliffBoardData>;

export async function dayResponse(date: string): Promise<Response> {
  try {
    const board = await getOrBuildPrototypeBoard(ratingsCliffSpec, date);
    if (!board) return errorResponse(404, "There is no Ratings Cliff for that day.");
    const body: PublicRatingsCliffBoard = {
      id: board.id,
      date: board.date,
      rounds: board.data.rounds.map((r) => ({
        seasons: toPublicSeasons(r.seasons),
        options: r.options.map((o) => ({ id: o.id, title: o.title })),
      })),
    };
    return Response.json(body, { headers: noStore });
  } catch (error) {
    console.error(`Ratings Cliff board for ${date} could not be built`, error);
    return errorResponse(502, "The day's board couldn't be made right now.");
  }
}

export async function boardOrErrorResponse(id: string): Promise<Board | Response> {
  return (await getPrototypeBoard(ratingsCliffSpec, id)) ?? errorResponse(404, "There is no such board.");
}

const GuessBody = z.object({
  round: z
    .number()
    .int()
    .min(0)
    .max(RULES.ratingsCliff.rounds - 1),
  option: z.string().min(1).max(32),
});

export async function guessResponse(board: Board, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const round = board.data.rounds[body.round];
  if (!round) return errorResponse(404, "That round is not on this board.");
  if (!round.options.some((o) => o.id === body.option)) return errorResponse(400, "That option is not in this round.");
  const years =
    round.firstYear && round.lastYear && round.lastYear !== round.firstYear
      ? `${round.firstYear}–${round.lastYear}`
      : String(round.firstYear ?? "");
  const result: RatingsCliffGuessResult = {
    correctOption: round.answer,
    series: years ? `${round.title} (${years})` : round.title,
    reveal: round.reveal,
  };
  return Response.json(result, { headers: noStore });
}
