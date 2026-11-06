"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReelSpinner } from "@/components/game/ReelSpinner";
import { fetchBoardList } from "@/lib/soundbytes/api";

type Entry = { id: string; name: string };

/** The boards there are to play, each marked if this device has started or finished it. */
export function BoardList() {
  const [boards, setBoards] = useState<Entry[] | null>(null);
  const [played, setPlayed] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBoardList().then(
      ({ boards }) => {
        setBoards(boards);
        const marks: Record<string, string> = {};
        for (const b of boards) {
          try {
            const raw = window.localStorage.getItem(`soundbytes:${b.id}`);
            const state = raw
              ? (JSON.parse(raw) as { state?: { status?: string; started?: boolean } }).state
              : undefined;
            if (state?.status === "won") marks[b.id] = "Solved";
            else if (state?.status === "lost") marks[b.id] = "Finished";
            else if (state?.started) marks[b.id] = "In progress";
          } catch {
            // Unreadable storage: show no mark.
          }
        }
        setPlayed(marks);
      },
      () => setBoards([]),
    );
  }, []);

  if (boards === null) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <ReelSpinner className="size-5" /> Looking for boards&hellip;
      </p>
    );
  }
  if (boards.length === 0) return <p className="text-ink-soft">No boards are available right now.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {boards.map((b) => (
        <li key={b.id}>
          <Link
            href={`/soundbytes/${b.id}`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-[6px] bg-surface px-4 ring-1 ring-ink/15 hover:ring-ink"
          >
            <span className="font-display text-2xl font-[850] leading-none">{b.name}</span>
            <span className="text-sm text-ink-soft">
              {played[b.id] ?? "Play"} <span aria-hidden="true">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
