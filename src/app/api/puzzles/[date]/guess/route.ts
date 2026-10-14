import { z } from "zod";

import { RULES } from "@/config/rules";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { checkGuess } from "@/lib/puzzle/grid";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

const GuessBody = z.object({
  tileIds: z.array(z.string().max(64)).length(RULES.grid.groupSize),
});

export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/guess">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;

  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;

  const result = checkGuess(puzzle, body.tileIds);
  if (result.kind === "invalid") return errorResponse(400, result.reason);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
