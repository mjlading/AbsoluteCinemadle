import { dayResponse } from "@/lib/ratings-cliff/handlers";

/** Building a board on a day's first visit takes a few seconds of TMDB lookups. */
export const maxDuration = 60;

/** One day's charts and options, without which option is right. */
export async function GET(_request: Request, ctx: RouteContext<"/api/ratings-cliff/day/[date]">) {
  return dayResponse((await ctx.params).date);
}
