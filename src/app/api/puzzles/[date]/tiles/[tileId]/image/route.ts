import { tileImageResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/** Serves a tile's picture under its opaque id, so the client never sees the source image. */
export async function GET(request: Request, ctx: RouteContext<"/api/puzzles/[date]/tiles/[tileId]/image">) {
  const { date, tileId } = await ctx.params;
  const puzzle = await puzzleOrErrorResponse(date);
  if (puzzle instanceof Response) return puzzle;
  return tileImageResponse(puzzle, tileId, request);
}
