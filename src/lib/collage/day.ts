import { SITE } from "@/config/site";
import { dayNumber } from "@/lib/dates";

/**
 * Close-Ups #1 is played on the launch date and numbers count up one per day
 * from it; a day before the launch (a test puzzle) has no number.
 */
export function closeUpsNumber(date: string | null): number | null {
  return date ? dayNumber(date, SITE.closeUpsLaunchDate) : null;
}

/** "Close-Ups #3", or plain "Close-Ups" for a day without a number. */
export function closeUpsTitle(date: string | null): string {
  const n = closeUpsNumber(date);
  return n ? `Close-Ups #${n}` : "Close-Ups";
}
