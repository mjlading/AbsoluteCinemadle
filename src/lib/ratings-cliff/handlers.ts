import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb/images";
import { toPublicSeasons } from "./chart";
import { getBoard, type RatingsCliffBoard } from "./source";
import type { PublicRatingsCliffBoard, RatingsCliffGuessResult } from "./types";

/*
 * Request handling for /api/ratings-cliff/... The client gets each round's
 * chart and the options' titles and posters; which option is right, and the series' name, only
 * come back from the guess route, one round at a time.
 */

const noStore = { "Cache-Control": "no-store" };

export function boardResponse(board: RatingsCliffBoard): Response {
  const body: PublicRatingsCliffBoard = {
    id: board.id,
    date: board.date,
    rounds: board.rounds.map((r) => ({
      seasons: toPublicSeasons(r.seasons),
      options: r.options.map((o) => ({ id: o.id, title: o.title, posterUrl: posterUrl(o.posterPath ?? null) })),
    })),
  };
  return Response.json(body, { headers: noStore });
}

/** Loads the board for a route's id param, or the error response to return instead. */
export async function boardOrErrorResponse(id: string): Promise<RatingsCliffBoard | Response> {
  return (await getBoard(id)) ?? errorResponse(404, "There is no such board.");
}

const GuessBody = z.object({
  round: z
    .number()
    .int()
    .min(0)
    .max(RULES.ratingsCliff.rounds - 1),
  option: z.string().min(1).max(32),
});

/** The right option and the reveal for one round; the series' name never comes before a pick. */
export async function guessResponse(board: RatingsCliffBoard, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const round = board.rounds[body.round];
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
