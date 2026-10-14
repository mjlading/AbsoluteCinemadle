import { puzzleResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

export async function GET(_request: Request, ctx: RouteContext<"/api/puzzles/[date]">) {
  const { date } = await ctx.params;
  const puzzle = await puzzleOrErrorResponse(date);
  if (puzzle instanceof Response) return puzzle;
  return puzzleResponse(puzzle, `/api/puzzles/${date}`, date);
}
