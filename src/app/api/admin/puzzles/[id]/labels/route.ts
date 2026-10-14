import { labelResponse } from "@/lib/puzzle/handlers";
import { previewPuzzleOrErrorResponse } from "../preview-puzzle";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/labels">) {
  const puzzle = await previewPuzzleOrErrorResponse((await ctx.params).id);
  if (puzzle instanceof Response) return puzzle;
  return labelResponse(puzzle, request);
}
