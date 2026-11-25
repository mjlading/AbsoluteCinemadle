import { actionResponse, dayResponse } from "@/lib/warmer/source";

/** The day's game: how many films there are to rank. */
export async function GET(_request: Request, ctx: RouteContext<"/api/warmer/day/[date]">) {
  return dayResponse((await ctx.params).date);
}

/** A guess's rank, a hint, or the answer on giving up. */
export async function POST(request: Request, ctx: RouteContext<"/api/warmer/day/[date]">) {
  return actionResponse((await ctx.params).date, request);
}
