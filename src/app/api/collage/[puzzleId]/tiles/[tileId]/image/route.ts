import { collageImageResponse } from "@/lib/collage/handlers";
import { collageOrErrorResponse } from "@/lib/collage/source";

/** Serves a tile's picture under its opaque id, cropped on the server, so the client never sees the source image. */
export async function GET(request: Request, ctx: RouteContext<"/api/collage/[puzzleId]/tiles/[tileId]/image">) {
  const { puzzleId, tileId } = await ctx.params;
  const puzzle = await collageOrErrorResponse(puzzleId);
  if (puzzle instanceof Response) return puzzle;
  return collageImageResponse(puzzle, tileId, request);
}
