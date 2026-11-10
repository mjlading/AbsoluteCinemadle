import { SITE } from "@/config/site";

const utcDay = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

/**
 * Soundbytes #1 is played on the launch date and numbers count up one per day
 * from it; a day before the launch (a test board) has no number.
 */
export function soundbytesNumber(date: string | null): number | null {
  if (!date) return null;
  const n = utcDay(date) - utcDay(SITE.soundbytesLaunchDate) + 1;
  return n >= 1 ? n : null;
}

/** "Soundbytes #3", or plain "Soundbytes" for a day without a number. */
export function soundbytesTitle(date: string | null): string {
  const n = soundbytesNumber(date);
  return n ? `Soundbytes #${n}` : "Soundbytes";
}
