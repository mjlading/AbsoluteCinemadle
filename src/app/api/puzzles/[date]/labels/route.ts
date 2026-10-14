import { labelResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/** Reveals one tile's label. POST because revealing costs the player points. */
export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/labels">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return labelResponse(puzzle, request);
}
