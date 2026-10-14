import { addDays } from "@/lib/dates";

export interface Streaks {
  current: number;
  best: number;
}

/**
 * Streaks over the days a player finished. Today's streak still counts
 * yesterday's run until midnight, so it doesn't drop to zero before they play.
 */
export function computeStreaks(finishedDates: Iterable<string>, today: string): Streaks {
  const days = new Set(finishedDates);
  let best = 0;
  for (const date of days) {
    if (days.has(addDays(date, -1))) continue; // not the start of a run
    let length = 0;
    while (days.has(addDays(date, length))) length++;
    best = Math.max(best, length);
  }
  let end = days.has(today) ? today : days.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let current = 0;
  while (end && days.has(end)) {
    current++;
    end = addDays(end, -1);
  }
  return { current, best };
}
