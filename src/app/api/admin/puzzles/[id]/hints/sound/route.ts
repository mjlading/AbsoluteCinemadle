import { soundHintResponse } from "@/lib/puzzle/handlers";
import { previewPuzzleOrErrorResponse } from "../../preview-puzzle";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/hints/sound">) {
  const puzzle = await previewPuzzleOrErrorResponse((await ctx.params).id);
  if (puzzle instanceof Response) return puzzle;
  return soundHintResponse(puzzle, request);
}
