import { dayResponse } from "@/lib/how-old/board";

/** Building a board on a day's first visit takes a few seconds of TMDB lookups. */
export const maxDuration = 60;

/** One day's board: actors, films, characters and posters, never a year or an age. */
export async function GET(_request: Request, ctx: RouteContext<"/api/how-old/day/[date]">) {
  const { date } = await ctx.params;
  return dayResponse(date);
}
