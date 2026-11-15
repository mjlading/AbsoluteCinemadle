import { prototypeImageResponse } from "@/lib/prototypes/images";

/** Serves one picture of a prototype game's board under its opaque id. */
export async function GET(_request: Request, ctx: RouteContext<"/api/prototypes/[boardId]/images/[imageId]">) {
  const { boardId, imageId } = await ctx.params;
  return prototypeImageResponse(boardId, imageId);
}
