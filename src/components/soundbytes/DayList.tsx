"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReelSpinner } from "@/components/game/ReelSpinner";
import { SITE } from "@/config/site";
import { localIsoDate } from "@/lib/dates";
import { readJson } from "@/lib/game/storage";
import { fetchSoundbytesDays } from "@/lib/soundbytes/api";
import { soundbytesNumber } from "@/lib/soundbytes/day";
import { wonOnLine, type SoundbytesState } from "@/lib/soundbytes/state";
import type { SoundbytesDay } from "@/lib/soundbytes/types";
import { RULES } from "@/config/rules";

/** "Mon 10 Nov" for a YYYY-MM-DD date, whatever the viewer's time zone. */
const shortDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
};

/** How this device left a day's game: nothing, still going, or the line it was named on. */
function progress(id: string): string {
  const state = readJson<{ state?: SoundbytesState }>(`soundbytes:${id}`)?.state;
  if (!state?.started) return "Play";
  if (state.status === "playing") return "In progress";
  return state.status === "won" ? `${wonOnLine(state)}/${RULES.soundbytes.lines}` : "Missed";
}

/** Every day so far, newest first, with how this device did on each. */
export function DayList() {
  const [days, setDays] = useState<(SoundbytesDay & { today: boolean; mark: string })[] | null>(null);

  useEffect(() => {
    const today = localIsoDate();
    fetchSoundbytesDays().then(
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
        <ReelSpinner className="size-5" /> Looking for boards&hellip;
      </p>
    );
  }
  if (days.length === 0) return <p className="text-ink-soft">No boards yet. The first one is coming soon.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {days.map((d) => (
        <li key={d.date}>
          <Link
            href={d.today ? SITE.games.soundbytes : `${SITE.games.soundbytes}/${d.date}`}
            className="flex min-h-14 items-center gap-4 rounded-[10px] bg-surface px-4 ring-1 ring-ink/15 hover:ring-ink"
          >
            <span className="w-14 font-display text-2xl font-[850] leading-none">
              {soundbytesNumber(d.date) ? `#${soundbytesNumber(d.date)}` : ""}
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
