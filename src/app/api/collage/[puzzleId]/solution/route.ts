import { collageSolutionResponse } from "@/lib/collage/handlers";
import { collageOrErrorResponse } from "@/lib/collage/source";

export async function GET(_request: Request, ctx: RouteContext<"/api/collage/[puzzleId]/solution">) {
  const { puzzleId } = await ctx.params;
  const puzzle = await collageOrErrorResponse(puzzleId);
  if (puzzle instanceof Response) return puzzle;
  return collageSolutionResponse(puzzle);
}
