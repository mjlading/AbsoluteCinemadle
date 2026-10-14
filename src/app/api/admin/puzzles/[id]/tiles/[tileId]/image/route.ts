import { tileImageResponse } from "@/lib/puzzle/handlers";
import { previewPuzzleOrErrorResponse } from "../../../preview-puzzle";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/tiles/[tileId]/image">) {
  const { id, tileId } = await ctx.params;
  const puzzle = await previewPuzzleOrErrorResponse(id);
  if (puzzle instanceof Response) return puzzle;
  // Private: drafts must not land in a shared cache.
  return tileImageResponse(puzzle, tileId, request, "private, max-age=86400");
}
