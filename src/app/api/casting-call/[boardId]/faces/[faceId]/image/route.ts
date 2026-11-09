import { boardOrErrorResponse, faceImageResponse } from "@/lib/casting-call/handlers";

/** Serves a face under its opaque id, rendered on the server. */
export async function GET(_request: Request, ctx: RouteContext<"/api/casting-call/[boardId]/faces/[faceId]/image">) {
  const { boardId, faceId } = await ctx.params;
  const board = boardOrErrorResponse(boardId);
  return board instanceof Response ? board : faceImageResponse(board, faceId);
}
