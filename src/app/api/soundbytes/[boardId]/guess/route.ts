import { boardOrErrorResponse, guessResponse } from "@/lib/soundbytes/handlers";

/** Checks a film or actor guess; the answer is only returned once it has been earned. */
export async function POST(request: Request, ctx: RouteContext<"/api/soundbytes/[boardId]/guess">) {
  const board = boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : guessResponse(board, request);
}
