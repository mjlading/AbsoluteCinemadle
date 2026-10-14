import { reviewHintResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/** A review hint for one of the films the player hasn't solved yet. POST because hints cost points. */
export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/hints/review">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return reviewHintResponse(puzzle, request);
}
