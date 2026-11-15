import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";

/*
 * Carbon Dating's rules, shared by the server (scoring a guess) and the client
 * (the recap and share text). Pure, so it is unit-tested.
 */

/** What the day route gives the client: one opaque picture per round, nothing that names a film. */
export interface PublicCarbonBoard {
  id: string;
  date: string;
  rounds: { imageUrl: string }[];
}

/** The server's answer to one round's guess. */
export interface CarbonReveal {
  year: number;
  title: string;
  points: number;
}

/** A played round, as the client keeps it. */
export interface CarbonRoundResult extends CarbonReveal {
  guess: number;
}

/** The latest year a player may pick: this year. */
export const maxYear = (now: Date = new Date()) => now.getFullYear();

/** True for a guess the slider could have produced. */
export const isValidGuess = (year: number, now: Date = new Date()) =>
  Number.isInteger(year) && year >= RULES.carbonDating.minYear && year <= maxYear(now) + 1;

/** Points for one round: the exact year scores in full, each year off costs a little, never below 0. */
export function roundPoints(guess: number, year: number): number {
  const { exact, perYearOff } = POINTS.carbonDating;
  return Math.max(0, exact + perYearOff * Math.abs(guess - year));
}

export const maxTotal = () => POINTS.carbonDating.exact * RULES.carbonDating.rounds;

export const totalPoints = (results: CarbonRoundResult[]) => results.reduce((sum, r) => sum + r.points, 0);

/** A coloured square for how far off a guess was, so a share says how close without saying the year. */
export function distanceSquare(guess: number, year: number): string {
  const off = Math.abs(guess - year);
  const { close, near, far } = RULES.carbonDating.shareBands;
  if (off <= close) return "🟩";
  if (off <= near) return "🟨";
  if (off <= far) return "🟧";
  return "🟥";
}

/** "Carbon Dating 2026-11-15 · 412/500" and a square per round: no titles, no years. */
export function carbonShareText(date: string, results: CarbonRoundResult[]): string {
  const squares = results.map((r) => distanceSquare(r.guess, r.year)).join("");
  return `Carbon Dating ${date} · ${totalPoints(results)}/${maxTotal()}\n${squares}`;
}

/** Keeps a typed or stepped year within the slider's range. */
export function clampYear(year: number, now: Date = new Date()): number {
  if (!Number.isFinite(year)) return RULES.carbonDating.minYear;
  return Math.min(maxYear(now), Math.max(RULES.carbonDating.minYear, Math.round(year)));
}
