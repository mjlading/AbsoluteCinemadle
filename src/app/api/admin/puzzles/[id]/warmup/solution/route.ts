import { warmupSolutionResponse } from "@/lib/puzzle/handlers";
import { previewPuzzleOrErrorResponse } from "../../preview-puzzle";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/warmup/solution">) {
  const puzzle = await previewPuzzleOrErrorResponse((await ctx.params).id);
  if (puzzle instanceof Response) return puzzle;
  return warmupSolutionResponse(puzzle);
}
