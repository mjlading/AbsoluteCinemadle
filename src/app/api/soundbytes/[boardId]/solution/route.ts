import { solutionResponse } from "@/lib/soundbytes/handlers";
import { boardOrErrorResponse } from "@/lib/soundbytes/source";

/** The answer, once the game is over in the player's browser. */
export async function GET(_request: Request, ctx: RouteContext<"/api/soundbytes/[boardId]/solution">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : solutionResponse(board);
}
