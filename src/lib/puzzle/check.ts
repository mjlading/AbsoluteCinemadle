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

/** Everything that must hold before a puzzle can be scheduled. */
export function checkPuzzle(puzzle: Puzzle): GridCheck {
  const grid = checkGrid(puzzle);
  const warmup = checkWarmup(puzzle);
  return { errors: [...grid.errors, ...warmup.errors], warnings: [...grid.warnings, ...warmup.warnings] };
}
