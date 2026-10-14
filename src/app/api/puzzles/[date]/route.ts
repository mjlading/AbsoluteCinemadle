import { toPublicPuzzle } from "@/lib/puzzle/grid";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

export async function GET(_request: Request, ctx: RouteContext<"/api/puzzles/[date]">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return Response.json(toPublicPuzzle(puzzle), { headers: { "Cache-Control": "no-store" } });
}
