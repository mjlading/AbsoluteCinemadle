/**
 * Builds the missing Ratings Cliff boards for a range of days, the same way the
 * server does (src/lib/ratings-cliff/source.ts), against whatever database
 * DATABASE_URL points at. The daily cron job normally does this; use it to fill
 * days at once, say when the game launches or after a re-roll.
 *
 *   npm run ratings-cliff:build -- --from=2026-11-10 --to=2026-11-23
 *
 * Days are built in date order, so each one's cooldown sees the days before it.
 * It prints only dates, never which series.
 */
import { addDays, isIsoDate } from "../src/lib/dates";
import { datesWithoutBoards, getOrBuildBoard } from "../src/lib/ratings-cliff/source";

const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const from = option("from");
const to = option("to");
if (!from || !to || !isIsoDate(from) || !isIsoDate(to) || to < from || addDays(from, 60) < to) {
  throw new Error("Usage: npm run ratings-cliff:build -- --from=YYYY-MM-DD --to=YYYY-MM-DD (at most 60 days)");
}

const missing = await datesWithoutBoards(from, to);
console.log(`${missing.length} of the days from ${from} to ${to} have no board yet.`);
let failed = 0;
for (const date of missing) {
  try {
    await getOrBuildBoard(date);
    console.log(`${date}  built`);
  } catch (error) {
    failed++;
    console.error(`${date}  failed: ${error instanceof Error ? error.message : error}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
