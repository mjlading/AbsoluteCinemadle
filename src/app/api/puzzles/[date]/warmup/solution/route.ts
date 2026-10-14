import { warmupSolutionResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/** The warm-up answers, for revealing the cards once the round is over (see ASSUMPTIONS.md). */
export async function GET(_request: Request, ctx: RouteContext<"/api/puzzles/[date]/warmup/solution">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return warmupSolutionResponse(puzzle);
}
