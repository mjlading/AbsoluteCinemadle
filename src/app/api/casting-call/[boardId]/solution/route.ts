import { boardOrErrorResponse, solutionResponse } from "@/lib/casting-call/handlers";

/** Every face's name, for when the player presses Start. */
export async function GET(_request: Request, ctx: RouteContext<"/api/casting-call/[boardId]/solution">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : solutionResponse(board);
}
