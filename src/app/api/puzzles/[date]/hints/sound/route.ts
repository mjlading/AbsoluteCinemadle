import { soundHintResponse } from "@/lib/puzzle/handlers";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

/** A sound hint for one of the films the player hasn't solved yet. POST because hints cost points. */
export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/hints/sound">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;
  return soundHintResponse(puzzle, request);
}
