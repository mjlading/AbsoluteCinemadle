import { boardOrErrorResponse, revealResponse } from "@/lib/deep-cut/handlers";

/** A prompt's most obvious answer and deep cut, for when the player has run out of tries. */
export async function POST(request: Request, ctx: RouteContext<"/api/deep-cut/[boardId]/reveal">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : revealResponse(board, request);
}
