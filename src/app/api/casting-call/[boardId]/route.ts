import { boardOrErrorResponse, boardResponse } from "@/lib/casting-call/handlers";

/** A board's faces, by opaque id only. */
export async function GET(_request: Request, ctx: RouteContext<"/api/casting-call/[boardId]">) {
  const board = boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : boardResponse(board);
}
