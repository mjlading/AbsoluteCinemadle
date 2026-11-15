import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";

/*
 * The pure rules of How Old Were They?: ages, points and the share text.
 * Used by the server (ages, points) and the client (share text).
 */

const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a full YYYY-MM-DD date, as TMDB gives birthdays and release dates. */
export const isFullDate = (value: string | null | undefined): value is string =>
  typeof value === "string" && FULL_DATE.test(value);

/** Whole years from a birthday to a date, both YYYY-MM-DD: the age someone was on that day. */
export function ageOn(birthday: string, date: string): number {
  const [by, bm, bd] = birthday.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  const hadBirthday = m > bm || (m === bm && d >= bd);
  return y - by - (hadBirthday ? 0 : 1);
}

/** Points for a guess: the full score for the exact age, less per year off, never below 0. */
export function pointsFor(guess: number, age: number): number {
  const { exact, perYearOff } = POINTS.howOld;
  return Math.max(0, exact + perYearOff * Math.abs(guess - age));
}

export const maxPoints = (rounds: number = RULES.howOld.rounds) => rounds * POINTS.howOld.exact;

/** One round's closeness as a mark that names nothing: exact, close, near, or far off. */
export function closenessMark(guess: number, age: number): string {
  const off = Math.abs(guess - age);
  if (off === 0) return "🎯";
  if (off <= RULES.howOld.share.close) return "🟩";
  if (off <= RULES.howOld.share.near) return "🟨";
  return "⬜";
}

export interface PlayedRound {
  guess: number;
  age: number;
  points: number;
}

/** The share text: the score and one mark per round, never a name, film or age. */
export function shareText(date: string, rounds: readonly PlayedRound[], url: string): string {
  const total = rounds.reduce((sum, r) => sum + r.points, 0);
  const marks = rounds.map((r) => closenessMark(r.guess, r.age)).join("");
  return `How Old Were They? ${date}\n${total}/${maxPoints(rounds.length)}\n${marks}\n${url}`;
}
