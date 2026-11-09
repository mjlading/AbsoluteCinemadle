import { boardOrErrorResponse, solutionResponse } from "@/lib/casting-call/handlers";

/** Every face's name, for a lost game. */
export async function GET(_request: Request, ctx: RouteContext<"/api/casting-call/[boardId]/solution">) {
  const board = boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : solutionResponse(board);
}
