import { boardResponse } from "@/lib/casting-call/handlers";
import { canBuildOnDemand, getBoardByDate, getOrBuildBoard } from "@/lib/casting-call/source";
import { isPlayableDate } from "@/lib/dates";
import { errorResponse } from "@/lib/http";

/** Building a board on the spot takes a few seconds of TMDB lookups. */
export const maxDuration = 60;

/**
 * One day's board by opaque face ids, never one whose day has not started
 * anywhere yet. A day that is today somewhere and has no board yet gets one
 * built now, so a missed cron run never leaves players without a game.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/casting-call/day/[date]">) {
  const { date } = await ctx.params;
  if (!isPlayableDate(date)) return errorResponse(404, "There is no Casting call for that day.");
  try {
    const board = canBuildOnDemand(date) ? await getOrBuildBoard(date) : await getBoardByDate(date);
    return board ? boardResponse(board) : errorResponse(404, "There is no Casting call for that day.");
  } catch (error) {
    console.error(`Casting call board for ${date} could not be built`, error);
    return errorResponse(502, "Today's board couldn't be made right now.");
  }
}
