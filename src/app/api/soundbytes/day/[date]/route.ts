import { isPlayableDate } from "@/lib/dates";
import { errorResponse } from "@/lib/http";
import { boardResponse } from "@/lib/soundbytes/handlers";
import { getBoardByDate } from "@/lib/soundbytes/source";

/** One day's board without its answer, never one whose day has not started anywhere yet. */
export async function GET(_request: Request, ctx: RouteContext<"/api/soundbytes/day/[date]">) {
  const { date } = await ctx.params;
  const board = isPlayableDate(date) ? await getBoardByDate(date) : null;
  return board ? boardResponse(board) : errorResponse(404, "There is no Soundbytes board for that day.");
}
