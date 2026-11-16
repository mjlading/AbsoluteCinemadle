"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReelSpinner } from "@/components/game/ReelSpinner";
import { SITE } from "@/config/site";
import { fetchRatingsCliffDays } from "@/lib/ratings-cliff/api";
import { ratingsCliffNumber } from "@/lib/ratings-cliff/day";
import { correctCount, isFinished, type RatingsCliffState } from "@/lib/ratings-cliff/state";
import type { RatingsCliffDay } from "@/lib/ratings-cliff/types";
import { localIsoDate } from "@/lib/dates";
import { readJson } from "@/lib/game/storage";
import { ratingsCliffStorageKey } from "./RatingsCliffGame";

/** "Mon 10 Nov" for a YYYY-MM-DD date, whatever the viewer's time zone. */
const shortDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
};

/** How this device left a day's game: not started, still going, or how many it got right. */
function progress(id: string): string {
  const state = readJson<{ state?: RatingsCliffState }>(ratingsCliffStorageKey(id))?.state;
  if (!state || state.answers.length === 0) return "Play";
  if (!isFinished(state)) return "In progress";
  return `${correctCount(state)} of ${state.answers.length} right`;
}

/** Every day so far, newest first, with how this device did on each. */
export function DayList() {
  const [days, setDays] = useState<(RatingsCliffDay & { today: boolean; mark: string })[] | null>(null);

  useEffect(() => {
    const today = localIsoDate();
    fetchRatingsCliffDays().then(
      ({ days }) =>
        setDays(
          days.filter((d) => d.date <= today).map((d) => ({ ...d, today: d.date === today, mark: progress(d.id) })),
        ),
      () => setDays([]),
    );
  }, []);

  if (days === null) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <ReelSpinner className="size-5" /> Looking for days&hellip;
      </p>
    );
  }
  if (days.length === 0) return <p className="text-ink-soft">No days yet. Today&rsquo;s is the first.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {days.map((d) => (
        <li key={d.date}>
          <Link
            href={d.today ? SITE.games.ratingsCliff : `${SITE.games.ratingsCliff}/${d.date}`}
            className="flex min-h-14 items-center gap-4 rounded-[10px] bg-surface px-4 ring-1 ring-ink/15 hover:ring-ink"
          >
            <span className="w-14 font-display text-2xl font-[850] leading-none">
              {ratingsCliffNumber(d.date) ? `#${ratingsCliffNumber(d.date)}` : ""}
            </span>
            <span className="flex-1 text-ink-soft">{d.today ? "Today" : shortDate(d.date)}</span>
            <span className="font-condensed text-[15px] font-bold">
              {d.mark} <span aria-hidden="true">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
