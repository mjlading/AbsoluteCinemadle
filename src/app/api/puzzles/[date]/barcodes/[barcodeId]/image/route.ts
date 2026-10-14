import { barcodeImageResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

export async function GET(_request: Request, ctx: RouteContext<"/api/puzzles/[date]/barcodes/[barcodeId]/image">) {
  const { date, barcodeId } = await ctx.params;
  const puzzle = await puzzleOrErrorResponse(date);
  if (puzzle instanceof Response) return puzzle;
  return barcodeImageResponse(puzzle, barcodeId);
}
