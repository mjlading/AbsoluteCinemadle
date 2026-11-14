import { bestRouteResponse, boardOrErrorResponse } from "@/lib/casting-call/handlers";

/** The board's best route, one film per pair of faces, for a finished game. */
export async function GET(_request: Request, ctx: RouteContext<"/api/casting-call/[boardId]/best-route">) {
  const board = await boardOrErrorResponse((await ctx.params).boardId);
  return board instanceof Response ? board : bestRouteResponse(board);
}
