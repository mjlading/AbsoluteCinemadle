import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";

export interface DayOutcome {
  /** Null when the puzzle had no warm-up. */
  warmup: { found: number; total: number } | null;
  grid: {
    groupsFound: number;
    mistakes: number;
    flips: number;
    soundHints: number;
    reviewHints: number;
  };
  /** Null until the bonus round has been checked. */
  bonus: { correct: number; total: number } | null;
}

export interface ScoreBreakdown {
  warmup: number;
  grid: number;
  bonus: number;
  total: number;
}

/**
 * The day's points, using only the values in config/scoring.ts. The grid's base
 * is shared out per film found, so a lost grid still earns something for its
 * solved groups; the grid never goes below zero.
 */
export function scoreDay(outcome: DayOutcome): ScoreBreakdown {
  const { grid } = outcome;
  const warmup = (outcome.warmup?.found ?? 0) * POINTS.warmup.perCorrectTitle;
  const gridPoints = Math.max(
    0,
    Math.round((POINTS.grid.base * grid.groupsFound) / RULES.grid.groupCount) +
      grid.mistakes * POINTS.grid.perMistake +
      grid.flips * POINTS.grid.perFlip +
      grid.soundHints * POINTS.grid.perSoundHint +
      grid.reviewHints * POINTS.grid.perReviewHint,
  );
  const bonus = (outcome.bonus?.correct ?? 0) * POINTS.barcode.perCorrectMatch;
  return { warmup, grid: gridPoints, bonus, total: warmup + gridPoints + bonus };
}

/** The best score a puzzle allows, for showing "of 190". */
export function maxScore(warmupTitles: number): number {
  return (
    warmupTitles * POINTS.warmup.perCorrectTitle +
    POINTS.grid.base +
    RULES.grid.groupCount * POINTS.barcode.perCorrectMatch
  );
}
