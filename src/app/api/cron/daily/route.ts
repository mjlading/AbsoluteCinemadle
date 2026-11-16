import { timingSafeEqual } from "node:crypto";

import { SITE } from "@/config/site";
import * as castingCall from "@/lib/casting-call/source";
import { addDays, utcIsoDate } from "@/lib/dates";
import { errorResponse } from "@/lib/http";
import * as ratingsCliff from "@/lib/ratings-cliff/source";

/** A board takes a few seconds to build; a run that has to fill many days stops before this. */
export const maxDuration = 300;

/** Days of boards kept ready ahead, counting today in UTC. */
const DAYS_AHEAD = 8;
/** A run stops starting new boards after this long, leaving the rest for the next run. */
const BUILD_BUDGET_MS = 230_000;
/** Stale boards refreshed per game per run (see each game's refreshStaleBoards). */
const REFRESH_PER_RUN = 20;

/** The games whose boards the server builds itself, each from its own launch date (#1). */
const GAMES = [
  { name: "casting-call", launch: SITE.castingCallLaunchDate, source: castingCall },
  { name: "ratings-cliff", launch: SITE.ratingsCliffLaunchDate, source: ratingsCliff },
] as const;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without the secret set, nobody gets in. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Run once a day by Vercel Cron (vercel.json): builds every missing Casting call
 * and Ratings Cliff board from each game's launch date (#1) to a week ahead, so
 * the archives have no gaps, and refreshes old TMDB data. Today and the days
 * ahead come first, for both games, then missing past days, newest first; what
 * doesn't fit in one run waits for the next.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return errorResponse(401, "Not allowed.");
  const started = Date.now();
  const today = utcIsoDate();
  const queues = await Promise.all(
    GAMES.map(async (game) => {
      const missing = await game.source.datesWithoutBoards(game.launch, addDays(today, DAYS_AHEAD - 1));
      return { game, upcoming: missing.filter((d) => d >= today), past: missing.filter((d) => d < today).reverse() };
    }),
  );
  const jobs = [
    ...queues.flatMap((q) => q.upcoming.map((date) => ({ game: q.game, date }))),
    ...queues.flatMap((q) => q.past.map((date) => ({ game: q.game, date }))),
  ];
  const built: string[] = [];
  const failed: string[] = [];
  for (const { game, date } of jobs) {
    if (Date.now() - started > BUILD_BUDGET_MS) break;
    try {
      await game.source.getOrBuildBoard(date);
      built.push(`${game.name} ${date}`);
    } catch (error) {
      console.error(`Daily cron could not build ${game.name} for ${date}`, error);
      failed.push(`${game.name} ${date}`);
    }
  }
  let refreshed = 0;
  for (const game of GAMES) refreshed += await game.source.refreshStaleBoards(REFRESH_PER_RUN);
  const left = jobs.length - built.length - failed.length;
  return Response.json(
    { built, failed, left, refreshed },
    { status: failed.length > 0 ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
