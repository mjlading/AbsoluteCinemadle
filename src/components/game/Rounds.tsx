"use client";

import { useMemo } from "react";

import { BonusRound } from "@/components/bonus/BonusRound";
import { GridRound } from "@/components/grid/GridRound";
import { Results } from "@/components/results/Results";
import { WarmupRound } from "@/components/warmup/WarmupRound";
import { bonusReducer, initialBonusState, type BonusState } from "@/lib/game/bonus-state";
import { gridReducer, initialGridState } from "@/lib/game/grid-state";
import { usePersistentReducer } from "@/lib/game/storage";
import { initialWarmupState, warmupReducer, type WarmupState } from "@/lib/game/warmup-state";
import type { PublicPuzzle } from "@/lib/puzzle/types";

type Round = "warmup" | "grid" | "bonus" | "results";

const ROUNDS: { id: Exclude<Round, "results">; name: string }[] = [
  { id: "warmup", name: "Warm-up" },
  { id: "grid", name: "Grid" },
  { id: "bonus", name: "Bonus" },
];

const setRound = (_current: Round, next: Round) => next;

/** A reload during the film leader starts the warm-up over from its intro; the clock had not started. */
const reviveWarmup = (state: WarmupState): WarmupState =>
  state.phase === "countdown" ? { ...state, phase: "intro" } : state;

/** Whatever was being held mid-match is dropped on reload. */
const reviveBonus = (state: BonusState): BonusState => ({ ...state, picked: null });

/**
 * The day's rounds in order, then the results. Every round's state is saved in
 * localStorage under `storageKey` (null for the admin preview), so a refresh
 * resumes where the player was. A puzzle without a warm-up starts at the grid.
 */
export function Rounds({
  puzzle,
  apiBase,
  storageKey,
}: {
  puzzle: PublicPuzzle;
  apiBase: string;
  storageKey: string | null;
}) {
  // Saved progress only applies to the exact puzzle it was made on.
  const signature = useMemo(
    () => [...puzzle.warmup.map((c) => c.id), ...puzzle.tiles.map((t) => t.id)].join(","),
    [puzzle],
  );
  const key = (part: string) => (storageKey ? `${storageKey}:${part}` : null);

  const [round, goTo] = usePersistentReducer<Round, Round, Round>(
    key("round"),
    signature,
    setRound,
    puzzle.warmup.length > 0 ? "warmup" : "grid",
    (first) => first,
  );
  const [warmup, warmupDispatch] = usePersistentReducer(
    key("warmup"),
    signature,
    warmupReducer,
    puzzle.warmup,
    initialWarmupState,
    reviveWarmup,
  );
  const [grid, gridDispatch] = usePersistentReducer(key("grid"), signature, gridReducer, puzzle, initialGridState);
  const [bonus, bonusDispatch] = usePersistentReducer(
    key("bonus"),
    signature,
    bonusReducer,
    null,
    () => initialBonusState,
    reviveBonus,
  );

  return (
    <>
      <RoundTracker current={round} />
      {round === "warmup" && (
        <WarmupRound
          cards={puzzle.warmup}
          apiBase={apiBase}
          state={warmup}
          dispatch={warmupDispatch}
          onContinue={() => goTo("grid")}
        />
      )}
      {round === "grid" && (
        <GridRound
          puzzle={puzzle}
          apiBase={apiBase}
          state={grid}
          dispatch={gridDispatch}
          onContinue={() => goTo("bonus")}
        />
      )}
      {round === "bonus" && (
        <BonusRound apiBase={apiBase} state={bonus} dispatch={bonusDispatch} onContinue={() => goTo("results")} />
      )}
      {round === "results" && (
        <Results puzzle={puzzle} warmup={warmup} grid={grid} bonus={bonus} recordHistory={storageKey !== null} />
      )}
    </>
  );
}

function RoundTracker({ current }: { current: Round }) {
  const currentIndex = current === "results" ? ROUNDS.length : ROUNDS.findIndex((r) => r.id === current);
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
