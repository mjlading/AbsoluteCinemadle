import { SITE } from "@/config/site";
import { dayNumber } from "@/lib/dates";

/**
 * Soundbytes #1 is played on the launch date and numbers count up one per day
 * from it; a day before the launch (a test board) has no number.
 */
export function soundbytesNumber(date: string | null): number | null {
  return date ? dayNumber(date, SITE.soundbytesLaunchDate) : null;
}

/** "Soundbytes #3", or plain "Soundbytes" for a day without a number. */
export function soundbytesTitle(date: string | null): string {
  const n = soundbytesNumber(date);
  return n ? `Soundbytes #${n}` : "Soundbytes";
}
