import { clipResponse } from "@/lib/soundbytes/handlers";

/** Serves a dialogue clip's audio under its opaque id, with byte ranges for media players. */
export async function GET(request: Request, ctx: RouteContext<"/api/soundbytes/[boardId]/clips/[clipId]">) {
  const { boardId, clipId } = await ctx.params;
  return clipResponse(boardId, clipId, request);
}
