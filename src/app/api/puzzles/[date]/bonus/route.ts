import { bonusResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/** The bonus round's films and barcodes; asked for once the grid is over (see ASSUMPTIONS.md). */
export async function GET(_request: Request, ctx: RouteContext<"/api/puzzles/[date]/bonus">) {
  const { date } = await ctx.params;
  const puzzle = await puzzleOrErrorResponse(date);
  if (puzzle instanceof Response) return puzzle;
  return bonusResponse(puzzle, `/api/puzzles/${date}`);
}
