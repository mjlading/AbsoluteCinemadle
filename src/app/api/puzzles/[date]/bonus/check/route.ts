import { bonusCheckResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/bonus/check">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return bonusCheckResponse(puzzle, request);
}
