import { boardOrErrorResponse, guessResponse } from "@/lib/ratings-cliff/handlers";

/** Checks one round's pick, answering with the right option and the reveal for that round only. */
export async function POST(request: Request, ctx: RouteContext<"/api/ratings-cliff/[boardId]/guess">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : guessResponse(board, request);
}
