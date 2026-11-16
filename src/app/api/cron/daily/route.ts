import { timingSafeEqual } from "node:crypto";

import { SITE } from "@/config/site";
import { datesWithoutBoards, getOrBuildBoard, refreshStaleBoards } from "@/lib/casting-call/source";
import { addDays, utcIsoDate } from "@/lib/dates";
import { errorResponse } from "@/lib/http";

/** A board takes a few seconds to build; a run that has to fill many days stops before this. */
export const maxDuration = 300;

/** Days of boards kept ready ahead, counting today in UTC. */
const DAYS_AHEAD = 8;
/** A run stops starting new boards after this long, leaving the rest for the next run. */
const BUILD_BUDGET_MS = 200_000;
/** Stale boards refreshed per run (see refreshStaleBoards). */
const REFRESH_PER_RUN = 20;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without the secret set, nobody gets in. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Run once a day by Vercel Cron (vercel.json): builds every missing Casting
 * call board from the launch date (#1) to a week ahead, so the archive has no
 * gaps, and refreshes old TMDB data. Today and the days ahead come first, then
 * missing past days, newest first; what doesn't fit in one run waits for the next.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return errorResponse(401, "Not allowed.");
  const started = Date.now();
  const today = utcIsoDate();
  const missing = await datesWithoutBoards(SITE.castingCallLaunchDate, addDays(today, DAYS_AHEAD - 1));
  const queue = [...missing.filter((d) => d >= today), ...missing.filter((d) => d < today).reverse()];
  const built: string[] = [];
  const failed: string[] = [];
  for (const date of queue) {
    if (Date.now() - started > BUILD_BUDGET_MS) break;
    try {
      await getOrBuildBoard(date);
      built.push(date);
    } catch (error) {
      console.error(`Casting call cron could not build ${date}`, error);
      failed.push(date);
    }
  }
  const refreshed = await refreshStaleBoards(REFRESH_PER_RUN);
  const left = queue.length - built.length - failed.length;
  return Response.json(
    { built, failed, left, refreshed },
    { status: failed.length > 0 ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
