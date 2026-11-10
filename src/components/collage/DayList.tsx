"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReelSpinner } from "@/components/game/ReelSpinner";
import { SITE } from "@/config/site";
import { fetchCollageDays } from "@/lib/collage/api";
import { closeUpsNumber } from "@/lib/collage/day";
import { collageScore, maxCollageScore, type CollageState } from "@/lib/collage/state";
import type { CollageDay } from "@/lib/collage/types";
import { localIsoDate } from "@/lib/dates";
import { readJson } from "@/lib/game/storage";

/** "Mon 10 Nov" for a YYYY-MM-DD date, whatever the viewer's time zone. */
const shortDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
};

/** How this device left a day's game: nothing, still going, or its score. */
function progress(id: string): string {
  const state = readJson<{ state?: CollageState }>(`close-ups:${id}`)?.state;
  if (!state) return "Play";
  if (state.status === "playing") return "In progress";
  return state.status === "won" ? `${collageScore(state)}/${maxCollageScore()}` : "Missed";
}

/** Every day so far, newest first, with how this device did on each. */
export function DayList() {
  const [days, setDays] = useState<(CollageDay & { today: boolean; mark: string })[] | null>(null);

  useEffect(() => {
    const today = localIsoDate();
    fetchCollageDays().then(
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
        <ReelSpinner className="size-5" /> Looking for puzzles&hellip;
      </p>
    );
  }
  if (days.length === 0) return <p className="text-ink-soft">No puzzles yet. The first one is coming soon.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {days.map((d) => (
        <li key={d.date}>
          <Link
            href={d.today ? SITE.games.closeUps : `${SITE.games.closeUps}/${d.date}`}
            className="flex min-h-14 items-center gap-4 rounded-[10px] bg-surface px-4 ring-1 ring-ink/15 hover:ring-ink"
          >
            <span className="w-14 font-display text-2xl font-[850] leading-none">
              {closeUpsNumber(d.date) ? `#${closeUpsNumber(d.date)}` : ""}
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
