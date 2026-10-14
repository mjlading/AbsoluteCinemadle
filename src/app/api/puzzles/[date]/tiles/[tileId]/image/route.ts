import { errorResponse } from "@/lib/http";
import { placeholderSvg } from "@/lib/puzzle/placeholder-image";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/**
 * Serves a tile's picture under its opaque id, so the client never sees the
 * underlying source (and, from phase 2, never sees an uncropped backdrop).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/puzzles/[date]/tiles/[tileId]/image">,
) {
  const { date, tileId } = await ctx.params;
  const puzzle = await puzzleOrErrorResponse(date);
  if (puzzle instanceof Response) return puzzle;

  const tile = puzzle.tiles.find((t) => t.id === tileId);
  if (!tile) return errorResponse(404, "That tile is not in this puzzle.");

  return new Response(placeholderSvg(tile.image.glyph, tile.image.hue), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
