"use client";

import { useEffect, useState } from "react";

import { Board } from "@/components/grid/Board";
import { GridRound } from "@/components/grid/GridRound";
import { RULES } from "@/config/rules";
import { ApiError, fetchPuzzle } from "@/lib/game/api";
import { localIsoDate } from "@/lib/dates";
import type { PublicPuzzle } from "@/lib/puzzle/types";
import { SiteHeader } from "./SiteHeader";

/** Loads the puzzle for the player's local date; the server can't know that date during prerendering. */
export function Game() {
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPuzzle(localIsoDate()).then(
      (loaded) => {
        if (!cancelled) setPuzzle(loaded);
      },
      (reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof ApiError && reason.status === 404
            ? "There's no puzzle for today yet. Check back later."
            : "Couldn't load today's puzzle. Check your connection and try again.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-5">
      <SiteHeader date={puzzle?.date ?? null} />
      {puzzle ? (
        <GridRound key={puzzle.date} puzzle={puzzle} />
      ) : error ? (
        <div className="mt-10 text-center">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
            className="mt-4 min-h-11 rounded-full border-[1.5px] border-ink px-5 font-semibold hover:bg-ink/8"
          >
            Try again
          </button>
        </div>
      ) : (
        <GridSkeleton />
      )}
    </main>
  );
}

function GridSkeleton() {
  const { groupCount, groupSize } = RULES.grid;
  return (
    <div className="mt-6">
      <p className="mb-3 text-ink-soft">Loading today&apos;s puzzle&hellip;</p>
      <Board busy>
        <div className="grid grid-cols-4 gap-(--gap)">
          {Array.from({ length: groupCount * groupSize }, (_, i) => (
            <div key={i} className="aspect-square rounded-[3px] bg-sheet-edge" />
          ))}
        </div>
      </Board>
    </div>
  );
}
