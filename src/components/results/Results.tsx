"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { correctCount, type BonusState } from "@/lib/game/bonus-state";
import type { GridState } from "@/lib/game/grid-state";
import { maxScore, scoreDay } from "@/lib/game/score";
import { puzzleNumber, shareText } from "@/lib/game/share";
import { readJson, writeJson } from "@/lib/game/storage";
import { computeStreaks } from "@/lib/game/streaks";
import { foundCount, type WarmupState } from "@/lib/game/warmup-state";
import type { PublicPuzzle, Tier } from "@/lib/puzzle/types";

export const HISTORY_KEY = "cinemadle:history";

type History = Record<string, { score: number; won: boolean }>;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The day's results, rolling up like end credits: the score and how it was
 * made, the films, the streak, a spoiler-free summary to share, and a
 * countdown to the next puzzle.
 */
export function Results({
  puzzle,
  warmup,
  grid,
  bonus,
  recordHistory,
}: {
  puzzle: PublicPuzzle;
  warmup: WarmupState;
  grid: GridState;
  bonus: BonusState;
  /** False in the admin preview, so previews never count towards a streak. */
  recordHistory: boolean;
}) {
  const breakdown = scoreDay({
    warmup: puzzle.warmup.length > 0 ? { found: foundCount(warmup), total: puzzle.warmup.length } : null,
    grid: {
      groupsFound: grid.solved.length,
      mistakes: grid.mistakes,
      flips: Object.keys(grid.labels).length,
      soundHints: grid.soundHints.length,
      reviewHints: grid.reviewHints.length,
    },
    bonus: bonus.results ? { correct: correctCount(bonus), total: bonus.results.length } : null,
  });

  const groups = [...grid.solved, ...grid.revealed].sort((a, b) => a.tier - b.tier);
  const tierOf = useMemo(() => {
    const map = new Map<string, Tier>();
    for (const group of [...grid.solved, ...grid.revealed]) for (const id of group.tileIds) map.set(id, group.tier);
    return map;
  }, [grid.solved, grid.revealed]);

  const text = shareText({
    date: puzzle.date,
    total: breakdown.total,
    warmup: puzzle.warmup.map((card) => Boolean(warmup.found[card.id])),
    gridGuesses: grid.guesses.map((guess) => guess.map((id) => tierOf.get(id) ?? 4)),
    bonus: bonus.results?.map((r) => r.correct) ?? [],
    hints: { flips: Object.keys(grid.labels).length, sound: grid.soundHints.length, review: grid.reviewHints.length },
  });

  // Today's record joins the history as the results open; the effect below saves it.
  const [history] = useState<History>(() => ({
    ...(recordHistory ? (readJson<History>(HISTORY_KEY) ?? {}) : {}),
    [puzzle.date]: { score: breakdown.total, won: grid.status === "won" },
  }));
  useEffect(() => {
    if (recordHistory) writeJson(HISTORY_KEY, history);
  }, [recordHistory, history]);
  const streaks = computeStreaks(Object.keys(history), puzzle.date);

  const lines: { key: string; node: React.ReactNode }[] = [
    { key: "number", node: <p className="text-sm text-white/60">Absolute Cinemadle #{puzzleNumber(puzzle.date)}</p> },
    {
      key: "score",
      node: (
        <h2 id="results-heading" className="font-display text-[5rem] font-[900] leading-[0.85]">
          {breakdown.total}
          <span className="sr-only"> points</span>
        </h2>
      ),
    },
    { key: "of", node: <p className="text-white/70">points of {maxScore(puzzle.warmup.length)}</p> },
    {
      key: "breakdown",
      node: (
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["Warm-up", breakdown.warmup],
              ["Grid", breakdown.grid],
              ["Bonus", breakdown.bonus],
            ] as const
          ).map(([name, points]) => (
            <div key={name} className="rounded-[4px] bg-white/8 px-2 py-2.5">
              <dt className="text-xs text-white/65">{name}</dt>
              <dd className="font-display text-2xl font-[850] leading-tight">{points}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    { key: "starring", node: <p className="mt-6 text-sm text-white/60">Starring</p> },
    ...groups.map((group) => ({
      key: `film-${group.filmId}`,
      node: (
        <p className="font-display text-2xl font-[850] leading-tight">
          {group.title}
          {group.year && <span className="font-sans text-base font-normal text-white/60"> {group.year}</span>}
        </p>
      ),
    })),
    {
      key: "streak",
      node: (
        <p className="mt-6 text-white/85">
          Streak: {plural(streaks.current, "day")}
          <span className="text-white/60"> (best {streaks.best})</span>
        </p>
      ),
    },
  ];

  return (
    <section aria-labelledby="results-heading" className="mt-6">
      <div className="overflow-hidden rounded-[6px] bg-sheet px-6 py-8 text-center text-white">
        {lines.map((line, index) => (
          <div key={line.key} className="credit-line" style={{ animationDelay: `${index * 110}ms` } as CSSProperties}>
            {line.node}
          </div>
        ))}
      </div>
      <ShareBox text={text} />
      <NextPuzzle />
    </section>
  );
}

function ShareBox({ text }: { text: string }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="mt-5 rounded-[6px] bg-surface p-4 ring-1 ring-ink/10">
      <p className="text-sm font-semibold">Share without spoilers</p>
      <p className="mt-2 whitespace-pre-line leading-snug" data-testid="share-text">
        {text}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-full bg-ink px-6 font-semibold text-table hover:bg-ink/85"
        >
          Copy results
        </button>
        <span role="status" className="text-sm text-ink-soft">
          {copied === "yes" && "Copied. Paste it anywhere."}
          {copied === "failed" && "Copying isn't allowed here. Select the text above instead."}
        </span>
      </div>
    </div>
  );
}

/** Time to the next local midnight, when the next puzzle opens. */
function NextPuzzle() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  if (!now) return null;
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const seconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const hh = Math.floor(seconds / 3600);
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <p className="mt-6 text-center text-ink-soft">
      {seconds === 0 ? (
        <>
          A new puzzle is ready.{" "}
          <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
            Play it
          </button>
        </>
      ) : (
        <>
          Next puzzle in{" "}
          <span className="font-semibold text-ink tabular-nums">
            {hh}:{mm}:{ss}
          </span>
        </>
      )}
    </p>
  );
}
