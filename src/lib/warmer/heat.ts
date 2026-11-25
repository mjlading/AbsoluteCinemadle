import { SITE } from "@/config/site";
import { dayNumber } from "@/lib/dates";
import type { RankedFilm } from "./types";

/*
 * How warm a rank is. The game is called Warmer, so close is hot and far is cold:
 * five steps from cold to burning, then the film itself. The same steps colour the
 * strip, the guess list and the shared squares.
 */

export interface HeatStep {
  key: "cold" | "cool" | "warm" | "hot" | "burning" | "film";
  label: string;
  /** The worst rank that still counts as this step. */
  worst: number;
  /** The tape's colour; the text on it is always ink. */
  color: string;
  emoji: string;
}

/** Coldest first. Cyan, paper and yellow are the site's own tapes; orange is Warmer's card. */
export const HEAT: readonly HeatStep[] = [
  { key: "cold", label: "Cold", worst: Infinity, color: "#4cc3d9", emoji: "🟦" },
  { key: "cool", label: "Cool", worst: 1000, color: "#edebe3", emoji: "⬜" },
  { key: "warm", label: "Warm", worst: 300, color: "#f2c641", emoji: "🟨" },
  { key: "hot", label: "Hot", worst: 50, color: "#f59a4a", emoji: "🟧" },
  { key: "burning", label: "Burning", worst: 10, color: "#ff5a47", emoji: "🟥" },
  { key: "film", label: "#1", worst: 1, color: "#e8eef1", emoji: "🎬" },
];

/** The step a rank falls in, as an index into HEAT. */
export function heatIndex(rank: number): number {
  let index = 0;
  for (let i = 1; i < HEAT.length; i++) if (rank <= HEAT[i].worst) index = i;
  return index;
}

export const heatOf = (rank: number): HeatStep => HEAT[heatIndex(rank)];

/** Warmer shares the other dailies' count; a day before it has no number. */
export const warmerNumber = (date: string): number | null => dayNumber(date, SITE.warmerLaunchDate);

/** "3 guesses, 1 hint": the hints are left out when there were none. */
export function tally(guesses: number, hints: number): string {
  const made = `${guesses} ${guesses === 1 ? "guess" : "guesses"}`;
  return hints ? `${made}, ${hints} ${hints === 1 ? "hint" : "hints"}` : made;
}

/** The share text: the day, how it went, then one square per guess in the order played. */
export function warmerShareText(date: string, entries: RankedFilm[], won: boolean): string {
  const guesses = entries.filter((e) => !e.hint);
  const n = warmerNumber(date);
  const title = n ? `Warmer #${n}` : `Warmer ${date}`;
  const result = tally(guesses.length, entries.length - guesses.length);
  const squares = guesses.map((g) => heatOf(g.rank).emoji).join("");
  return `${title}: ${won ? result : `gave up after ${result}`}\n${squares}`;
}
