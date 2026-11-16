import { canBuildOnDemand, isPlayableDate } from "@/lib/dates";
import { errorResponse } from "@/lib/http";
import { boardResponse } from "@/lib/ratings-cliff/handlers";
import { getBoardByDate, getOrBuildBoard } from "@/lib/ratings-cliff/source";

/** Building a board on the spot takes a few seconds of TMDB lookups. */
export const maxDuration = 60;

/**
 * One day's charts and options, without which option is right, never for a day
 * that has not started anywhere yet. A day that is today somewhere and has no
 * board yet gets one built now, so a missed cron run never leaves players without a game.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/ratings-cliff/day/[date]">) {
  const { date } = await ctx.params;
  if (!isPlayableDate(date)) return errorResponse(404, "There is no Ratings Cliff for that day.");
  try {
    const board = canBuildOnDemand(date) ? await getOrBuildBoard(date) : await getBoardByDate(date);
    return board ? boardResponse(board) : errorResponse(404, "There is no Ratings Cliff for that day.");
  } catch (error) {
    console.error(`Ratings Cliff board for ${date} could not be built`, error);
    return errorResponse(502, "Today's board couldn't be made right now.");
  }
}
