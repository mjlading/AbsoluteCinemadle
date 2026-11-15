import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { prototypeImageUrl } from "@/lib/prototypes/images";
import { getCarbonBoard, getCarbonBoardForDate } from "./board";
import { isValidGuess, roundPoints, type CarbonReveal, type PublicCarbonBoard } from "./game";

/*
 * Request handling for /api/carbon-dating/... The day route gives only opaque
 * pictures; a round's film and year come back from the guess route once that
 * round has been guessed.
 */

const noStore = { "Cache-Control": "no-store" };

export async function dayResponse(date: string): Promise<Response> {
  try {
    const board = await getCarbonBoardForDate(date);
    if (!board) return errorResponse(404, "There is no Carbon Dating for that day.");
    const body: PublicCarbonBoard = {
      id: board.id,
      date: board.date,
      rounds: board.data.rounds.map((_, i) => ({ imageUrl: prototypeImageUrl(board.id, String(i)) })),
    };
    return Response.json(body, { headers: noStore });
  } catch (error) {
    console.error(`Carbon Dating board for ${date} could not be built`, error);
    return errorResponse(502, "Today's stills couldn't be picked right now.");
  }
}

const GuessBody = z.object({
  round: z
    .number()
    .int()
    .min(0)
    .max(RULES.carbonDating.rounds - 1),
  year: z.number().int(),
});

export async function guessResponse(boardId: string, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  if (!isValidGuess(body.year)) return errorResponse(400, "That year is out of range.");
  const board = await getCarbonBoard(boardId);
  if (!board) return errorResponse(404, "There is no such board.");
  const round = board.data.rounds[body.round];
  if (!round) return errorResponse(404, "There is no such round.");
  const reveal: CarbonReveal = { year: round.year, title: round.title, points: roundPoints(body.year, round.year) };
  return Response.json(reveal, { headers: noStore });
}
