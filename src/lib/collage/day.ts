import { SITE } from "@/config/site";

const utcDay = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

/**
 * Close-Ups #1 is played on the launch date and numbers count up one per day
 * from it; a day before the launch (a test puzzle) has no number.
 */
export function closeUpsNumber(date: string | null): number | null {
  if (!date) return null;
  const n = utcDay(date) - utcDay(SITE.closeUpsLaunchDate) + 1;
  return n >= 1 ? n : null;
}

/** "Close-Ups #3", or plain "Close-Ups" for a day without a number. */
export function closeUpsTitle(date: string | null): string {
  const n = closeUpsNumber(date);
  return n ? `Close-Ups #${n}` : "Close-Ups";
}
