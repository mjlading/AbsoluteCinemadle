"use client";

import { useState } from "react";

import { BonusRound } from "@/components/bonus/BonusRound";
import { GridRound } from "@/components/grid/GridRound";
import { WarmupRound } from "@/components/warmup/WarmupRound";
import type { PublicPuzzle } from "@/lib/puzzle/types";

type Round = "warmup" | "grid" | "bonus";

const ROUNDS: { id: Round; name: string }[] = [
  { id: "warmup", name: "Warm-up" },
  { id: "grid", name: "Grid" },
  { id: "bonus", name: "Bonus" },
];

/** The day's rounds in order. A puzzle without a warm-up (only possible in a preview) starts at the grid. */
export function Rounds({ puzzle, apiBase }: { puzzle: PublicPuzzle; apiBase: string }) {
  const [round, setRound] = useState<Round>(puzzle.warmup.length > 0 ? "warmup" : "grid");

  return (
    <>
      <RoundTracker current={round} />
      {round === "warmup" && (
        <WarmupRound cards={puzzle.warmup} apiBase={apiBase} onContinue={() => setRound("grid")} />
      )}
      {round === "grid" && <GridRound puzzle={puzzle} apiBase={apiBase} onContinue={() => setRound("bonus")} />}
      {round === "bonus" && <BonusRound apiBase={apiBase} />}
    </>
  );
}

function RoundTracker({ current }: { current: Round }) {
  const currentIndex = ROUNDS.findIndex((r) => r.id === current);
  return (
    <nav aria-label="Rounds" className="mt-5">
      <ol className="flex gap-1.5">
        {ROUNDS.map((r, index) => (
          <li
            key={r.id}
            aria-current={index === currentIndex ? "step" : undefined}
            className={`flex-1 border-t-[3px] pt-1.5 text-sm ${
              index === currentIndex
                ? "border-ink font-semibold text-ink"
                : index < currentIndex
                  ? "border-ink/40 text-ink-soft"
                  : "border-ink/15 text-ink-soft"
            }`}
          >
            <span className="sr-only">
              Round {index + 1} of {ROUNDS.length}:{" "}
            </span>
            {r.name}
          </li>
        ))}
      </ol>
    </nav>
  );
}
