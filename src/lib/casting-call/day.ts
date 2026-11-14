import { SITE } from "@/config/site";
import { dayNumber } from "@/lib/dates";

/**
 * Casting call shares the other dailies' count: #1 is the launch date and
 * numbers count up one per day from it. A day before the launch has no number.
 */
export function castingCallNumber(date: string | null): number | null {
  return date ? dayNumber(date, SITE.castingCallLaunchDate) : null;
}

/** "Casting call #6", or plain "Casting call" for a day without a number. */
export function castingCallTitle(date: string | null): string {
  const n = castingCallNumber(date);
  return n ? `Casting call #${n}` : "Casting call";
}
