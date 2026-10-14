import { RULES } from "@/config/rules";
import { checkGrid, type GridCheck } from "./grid";
import type { Puzzle } from "./types";

/** Problems with the warm-up: the right number of titles, and none of them a grid film. */
export function checkWarmup(puzzle: Puzzle): GridCheck {
  const { titleCount } = RULES.warmup;
  const errors: string[] = [];
  if (puzzle.warmup.length !== titleCount) {
    errors.push(`Add ${titleCount} warm-up titles (${puzzle.warmup.length} so far).`);
  }
  const gridFilms = new Set(puzzle.films.map((f) => f.tmdbId));
  for (const entry of puzzle.warmup) {
    if (gridFilms.has(entry.filmId)) errors.push(`${entry.answer.title} is in both the warm-up and the grid.`);
  }
  return { errors, warnings: [] };
}

/** Bands a generated barcode needs before it is worth matching. */
const MIN_BANDS = 3;

/** Every grid film needs a barcode for the bonus round: a generated palette strip or an upload. */
export function checkBarcodes(puzzle: Puzzle): GridCheck {
  const errors = puzzle.films
    .filter((film) => !film.barcode.upload && (film.barcode.colors?.length ?? 0) < MIN_BANDS)
    .map((film) => `${film.title} needs a barcode: regenerate it or upload one.`);
  return { errors, warnings: [] };
}

/** Hints are optional, but a film without one makes the hint buttons skip it. */
export function checkHints(puzzle: Puzzle): GridCheck {
  const warnings: string[] = [];
  const noSound = puzzle.films.filter((f) => !f.soundHint).map((f) => f.title);
  const noReview = puzzle.films.filter((f) => !f.reviewHint).map((f) => f.title);
  if (noSound.length > 0) warnings.push(`No sound hint yet for ${noSound.join(", ")}.`);
  if (noReview.length > 0) warnings.push(`No review hint yet for ${noReview.join(", ")}.`);
  return { errors: [], warnings };
}

/** Everything that must hold before a puzzle can be scheduled. */
export function checkPuzzle(puzzle: Puzzle): GridCheck {
  const checks = [checkGrid(puzzle), checkWarmup(puzzle), checkBarcodes(puzzle), checkHints(puzzle)];
  return { errors: checks.flatMap((c) => c.errors), warnings: checks.flatMap((c) => c.warnings) };
}
