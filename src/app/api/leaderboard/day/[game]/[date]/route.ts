import { dailyResponse } from "@/lib/leaderboard/handlers";

/** Everyone's result for one game's daily, best first. */
export async function GET(request: Request, ctx: RouteContext<"/api/leaderboard/day/[game]/[date]">) {
  const { game, date } = await ctx.params;
  return dailyResponse(game, date, request);
}
