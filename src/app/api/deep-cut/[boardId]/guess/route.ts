import { boardOrErrorResponse, guessResponse } from "@/lib/deep-cut/handlers";

/** Checks a film against one prompt: does it fit, and if so how rare an answer it is. */
export async function POST(request: Request, ctx: RouteContext<"/api/deep-cut/[boardId]/guess">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : guessResponse(board, request);
}
