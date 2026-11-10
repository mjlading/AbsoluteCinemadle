const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

/** The player's local calendar date, which decides which puzzle they get. */
export function localIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Local dates run from UTC-12 to UTC+14, so no player anywhere is later than
 * tomorrow in UTC. Anything beyond that would be peeking at a future puzzle.
 */
export function isPlayableDate(date: string, now: Date = new Date()): boolean {
  const tomorrowUtc = new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
  return isIsoDate(date) && date <= tomorrowUtc;
}

/** Today's date in UTC, the base for the latest day the server will hand out. */
export function utcIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD date moved by a number of days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** "Wednesday 14 October" for a YYYY-MM-DD date, independent of the viewer's time zone. */
export function formatPuzzleDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
