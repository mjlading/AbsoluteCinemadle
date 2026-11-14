import { timingSafeEqual } from "node:crypto";

import { getOrBuildBoard, refreshStaleBoards } from "@/lib/casting-call/source";
import { addDays, utcIsoDate } from "@/lib/dates";
import { errorResponse } from "@/lib/http";

/** Building a week of boards takes a few seconds each. */
export const maxDuration = 300;

/** Days of boards kept ready ahead, counting today in UTC. */
const DAYS_AHEAD = 8;
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
 * Run once a day by Vercel Cron (vercel.json): builds the coming week's
 * Casting call boards that don't exist yet, and refreshes old TMDB data.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return errorResponse(401, "Not allowed.");
  const today = utcIsoDate();
  const built: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    try {
      await getOrBuildBoard(date);
      built.push(date);
    } catch (error) {
      console.error(`Casting call cron could not build ${date}`, error);
      failed.push(date);
    }
  }
  const refreshed = await refreshStaleBoards(REFRESH_PER_RUN);
  return Response.json(
    { ready: built, failed, refreshed },
    { status: failed.length > 0 ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
