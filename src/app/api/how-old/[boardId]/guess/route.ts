import { guessResponse } from "@/lib/how-old/board";

/** Scores a guessed age for one round and reveals that round's true age and year. */
export async function POST(request: Request, ctx: RouteContext<"/api/how-old/[boardId]/guess">) {
  const { boardId } = await ctx.params;
  return guessResponse(boardId, request);
}
