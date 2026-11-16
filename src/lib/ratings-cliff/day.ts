import { SITE } from "@/config/site";
import { dayNumber } from "@/lib/dates";

/**
 * Ratings Cliff shares the other dailies' count: #1 is the launch date and
 * numbers count up one per day from it. A day before the launch has no number.
 */
export function ratingsCliffNumber(date: string | null): number | null {
  return date ? dayNumber(date, SITE.ratingsCliffLaunchDate) : null;
}

/** "Ratings Cliff #8", or plain "Ratings Cliff" for a day without a number. */
export function ratingsCliffTitle(date: string | null): string {
  const n = ratingsCliffNumber(date);
  return n ? `Ratings Cliff #${n}` : "Ratings Cliff";
}
