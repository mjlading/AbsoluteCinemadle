import { solution } from "@/lib/puzzle/grid";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/**
 * All groups, for revealing the grid once the player runs out of mistakes.
 * Guess state lives in the player's browser, so this cannot check that the
 * round is really over; see ASSUMPTIONS.md.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/puzzles/[date]/solution">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return Response.json({ groups: solution(puzzle) }, { headers: { "Cache-Control": "no-store" } });
}
