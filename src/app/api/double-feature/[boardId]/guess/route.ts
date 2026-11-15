import { guessResponse } from "@/lib/double-feature/handlers";

/** Reveals one round: which film wins and both films' values. */
export async function POST(request: Request, ctx: RouteContext<"/api/double-feature/[boardId]/guess">) {
  const { boardId } = await ctx.params;
  return guessResponse(boardId, request);
}
