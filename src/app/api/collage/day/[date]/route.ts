import { isPlayableDate } from "@/lib/dates";
import { collageResponse } from "@/lib/collage/handlers";
import { getCollagePuzzleByDate } from "@/lib/collage/source";
import { errorResponse } from "@/lib/http";

/** One day's Close-Ups puzzle, never one whose day has not started anywhere yet. */
export async function GET(_request: Request, ctx: RouteContext<"/api/collage/day/[date]">) {
  const { date } = await ctx.params;
  const puzzle = isPlayableDate(date) ? await getCollagePuzzleByDate(date) : null;
  return puzzle ? collageResponse(puzzle) : errorResponse(404, "There is no Close-Up for that day.");
}
