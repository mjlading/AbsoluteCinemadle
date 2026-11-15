import { dayResponse } from "@/lib/carbon-dating/handlers";

/** Building a board on a day's first visit takes a few seconds of TMDB lookups. */
export const maxDuration = 60;

/** One day's board: an opaque picture per round, nothing that names a film. */
export async function GET(_request: Request, ctx: RouteContext<"/api/carbon-dating/day/[date]">) {
  const { date } = await ctx.params;
  return dayResponse(date);
}
