import { guessResponse } from "@/lib/soundbytes/handlers";
import { boardOrErrorResponse } from "@/lib/soundbytes/source";

/** Checks a film or actor guess; the answer is only returned once it has been earned. */
export async function POST(request: Request, ctx: RouteContext<"/api/soundbytes/[boardId]/guess">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : guessResponse(board, request);
}
