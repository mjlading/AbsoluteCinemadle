import { guessResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/guess">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return guessResponse(puzzle, request);
}
