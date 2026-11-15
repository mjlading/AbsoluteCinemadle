import { dayResponse } from "@/lib/double-feature/handlers";

/** Building a board on the spot takes a few seconds of TMDB lookups. */
export const maxDuration = 60;

/** One day's board, without the values the questions ask about. */
export async function GET(_request: Request, ctx: RouteContext<"/api/double-feature/day/[date]">) {
  const { date } = await ctx.params;
  return dayResponse(date);
}
