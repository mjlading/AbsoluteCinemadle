import { bonusResponse } from "@/lib/puzzle/handlers";
import { previewPuzzleOrErrorResponse } from "../preview-puzzle";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/bonus">) {
  const { id } = await ctx.params;
  const puzzle = await previewPuzzleOrErrorResponse(id);
  if (puzzle instanceof Response) return puzzle;
  return bonusResponse(puzzle, `/api/admin/puzzles/${id}`);
}
