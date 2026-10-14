import { barcodeImageResponse } from "@/lib/puzzle/handlers";
import { previewPuzzleOrErrorResponse } from "../../../preview-puzzle";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/barcodes/[barcodeId]/image">) {
  const { id, barcodeId } = await ctx.params;
  const puzzle = await previewPuzzleOrErrorResponse(id);
  if (puzzle instanceof Response) return puzzle;
  // Private and short-lived: drafts must not land in a shared cache, and uploads can be replaced.
  return barcodeImageResponse(puzzle, barcodeId, "private, no-cache");
}
