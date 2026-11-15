import { getDeepCutBoardByDate } from "@/lib/deep-cut/board";
import { boardResponse } from "@/lib/deep-cut/handlers";
import { errorResponse } from "@/lib/http";

/** Building a board on a day's first visit takes some seconds of TMDB lookups. */
export const maxDuration = 60;

/** One day's prompts, as text only. */
export async function GET(_request: Request, ctx: RouteContext<"/api/deep-cut/day/[date]">) {
  const { date } = await ctx.params;
  try {
    const board = await getDeepCutBoardByDate(date);
    return board ? boardResponse(board) : errorResponse(404, "There is no Deep Cut for that day.");
  } catch (error) {
    console.error(`Deep Cut board for ${date} could not be built`, error);
    return errorResponse(502, "That day's prompts couldn't be made right now.");
  }
}
