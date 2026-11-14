import { boardOrErrorResponse, guessResponse } from "@/lib/casting-call/handlers";

/** Checks which faces on the board are in a film's cast, naming only those. */
export async function POST(request: Request, ctx: RouteContext<"/api/casting-call/[boardId]/guess">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : guessResponse(board, request);
}
