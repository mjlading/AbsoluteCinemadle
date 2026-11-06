"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReelSpinner } from "@/components/game/ReelSpinner";
import { fetchCollageList } from "@/lib/collage/api";

type Entry = { id: string; name: string };

/** The puzzles there are to play, or the preview note when there are none (as on the live site for now). */
export function PuzzleList() {
  const [puzzles, setPuzzles] = useState<Entry[] | null>(null);
  const [played, setPlayed] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCollageList().then(
      ({ puzzles }) => {
        setPuzzles(puzzles);
        // Any saved game for a puzzle marks it as started or finished; the signature check is the game's job.
        const marks: Record<string, string> = {};
        for (const p of puzzles) {
          try {
            const raw = window.localStorage.getItem(`collage:${p.id}`);
            const status = raw ? (JSON.parse(raw) as { state?: { status?: string } }).state?.status : undefined;
            if (status) marks[p.id] = status === "playing" ? "In progress" : status === "won" ? "Solved" : "Finished";
          } catch {
            // Unreadable storage: show no mark.
          }
        }
        setPlayed(marks);
      },
      () => setPuzzles([]),
    );
  }, []);

  if (puzzles === null) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <ReelSpinner className="size-5" /> Looking for puzzles&hellip;
      </p>
    );
  }
  if (puzzles.length === 0) {
    return (
      <p className="leading-snug text-ink-soft">
        This game is a preview. Image clues and guessing are not available yet.
      </p>
    );
  }
  return (
    <>
      <p className="leading-snug text-ink-soft">Pick a puzzle. Each one is a different film.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {puzzles.map((p) => (
          <li key={p.id}>
            <Link
              href={`/keyword-collage/${p.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-[6px] bg-surface px-4 ring-1 ring-ink/15 hover:ring-ink"
            >
              <span className="font-display text-2xl font-[850] leading-none">{p.name}</span>
              <span className="text-sm text-ink-soft">
                {played[p.id] ?? "Play"} <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
