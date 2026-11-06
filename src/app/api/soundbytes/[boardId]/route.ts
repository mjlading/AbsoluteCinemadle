import { boardOrErrorResponse, boardResponse } from "@/lib/soundbytes/handlers";

/** A board without its answer. */
export async function GET(_request: Request, ctx: RouteContext<"/api/soundbytes/[boardId]">) {
  const board = boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : boardResponse(board);
}
