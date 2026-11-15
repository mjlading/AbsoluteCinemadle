import { guessResponse } from "@/lib/carbon-dating/handlers";

/** Scores one round's year and reveals that round's film. */
export async function POST(request: Request, ctx: RouteContext<"/api/carbon-dating/[boardId]/guess">) {
  const { boardId } = await ctx.params;
  return guessResponse(boardId, request);
}
