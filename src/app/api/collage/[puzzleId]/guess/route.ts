import { collageGuessResponse } from "@/lib/collage/handlers";
import { collageOrErrorResponse } from "@/lib/collage/source";

/** Checks a title guess; the answer is only returned once it has been earned. */
export async function POST(request: Request, ctx: RouteContext<"/api/collage/[puzzleId]/guess">) {
  const { puzzleId } = await ctx.params;
  const puzzle = await collageOrErrorResponse(puzzleId);
  if (puzzle instanceof Response) return puzzle;
  return collageGuessResponse(puzzle, request);
}
