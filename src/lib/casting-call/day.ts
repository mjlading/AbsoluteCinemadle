import { SITE } from "@/config/site";

const utcDay = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

/**
 * Casting call shares the other dailies' count: #1 is the launch date and
 * numbers count up one per day from it. A day before the launch has no number.
 */
export function castingCallNumber(date: string | null): number | null {
  if (!date) return null;
  const n = utcDay(date) - utcDay(SITE.castingCallLaunchDate) + 1;
  return n >= 1 ? n : null;
}

/** "Casting call #6", or plain "Casting call" for a day without a number. */
export function castingCallTitle(date: string | null): string {
  const n = castingCallNumber(date);
  return n ? `Casting call #${n}` : "Casting call";
}
