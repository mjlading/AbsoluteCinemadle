import { RULES } from "@/config/rules";
import { QUESTION_KINDS, formatValue, type QuestionKind } from "./questions";

/*
 * Pure board building: given films with their facts and a seeded random
 * source, picks the day's question order and a fair pair for each round.
 */

export interface CandidateFilm {
  tmdbId: number;
  title: string;
  /** YYYY-MM-DD */
  releaseDate: string;
  runtime: number;
  /** Null when TMDB doesn't know it (or has a value too small to trust). */
  budget: number | null;
  revenue: number | null;
  /** TMDB vote average, rounded to 0.1. */
  rating: number;
  voteCount: number;
  posterPath: string;
}

export interface PickedFilm {
  tmdbId: number;
  title: string;
  year: number;
  /** The film's value for the round's question: minutes, dollars, rating, or release year. */
  value: number;
  display: string;
  posterPath: string;
}

export interface PickedRound {
  kind: QuestionKind;
  style: PairStyle;
  films: [PickedFilm, PickedFilm];
  /** Which of the two wins. */
  correct: 0 | 1;
}

export type PairStyle = "close" | "surprise" | "open";

type Rules = typeof RULES.doubleFeature.board;

const yearOf = (film: CandidateFilm) => Number(film.releaseDate.slice(0, 4));

/** The film's number for a kind, or null when it has none worth asking about. */
export function statOf(film: CandidateFilm, kind: QuestionKind): number | null {
  switch (kind) {
    case "runtime":
      return film.runtime;
    case "budget":
      return film.budget;
    case "revenue":
      return film.revenue;
    case "rating":
      return film.rating;
    case "release":
      return yearOf(film);
  }
}

/** The winner of a comparison: the higher value, except for release, where the earlier film wins. */
export function winnerOf(kind: QuestionKind, a: CandidateFilm, b: CandidateFilm): 0 | 1 {
  if (kind === "release") return a.releaseDate <= b.releaseDate ? 0 : 1;
  return (statOf(a, kind) ?? 0) >= (statOf(b, kind) ?? 0) ? 0 : 1;
}

/** How far apart two values are, in the unit of that kind's margins (minutes, points, years, or a ratio). */
export function marginOf(kind: QuestionKind, x: number, y: number): number {
  if (kind === "budget" || kind === "revenue") return Math.max(x, y) / Math.min(x, y);
  // Ratings are compared as shown (0.1 steps), without floating point noise.
  if (kind === "rating") return Math.round(Math.abs(x - y) * 10) / 10;
  return Math.abs(x - y);
}

/** True when the pair makes a fair question of this kind: both have the value, and it differs clearly but not absurdly. */
export function isFairPair(kind: QuestionKind, a: CandidateFilm, b: CandidateFilm, rules: Rules): boolean {
  const x = statOf(a, kind);
  const y = statOf(b, kind);
  if (x === null || y === null) return false;
  const { min, max } = rules.margins[kind];
  const margin = marginOf(kind, x, y);
  if (margin < min || margin > max) return false;
  if ((kind === "budget" || kind === "revenue") && Math.abs(yearOf(a) - yearOf(b)) > rules.moneyMaxYearsApart) {
    return false;
  }
  return true;
}

/** True when a fair pair also fits the round's style. */
export function fitsStyle(
  style: PairStyle,
  kind: QuestionKind,
  a: CandidateFilm,
  b: CandidateFilm,
  rules: Rules,
): boolean {
  const margin = marginOf(kind, statOf(a, kind)!, statOf(b, kind)!);
  const [winner, loser] = winnerOf(kind, a, b) === 0 ? [a, b] : [b, a];
  switch (style) {
    case "open":
      return true;
    case "close":
      return margin <= rules.margins[kind].close;
    case "surprise":
      if (kind === "runtime") return yearOf(winner) <= yearOf(loser) - rules.surpriseRuntimeYearsOlder;
      if (kind === "release") return margin <= rules.margins[kind].close; // no surprise defined: a close call
      return winner.voteCount <= loser.voteCount * rules.surpriseVoteShare;
  }
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The day's question kinds: each about equally often, in a seeded order with no kind twice in a row where possible. */
export function questionOrder(rounds: number, rng: () => number): QuestionKind[] {
  const kinds = Array.from({ length: rounds }, (_, i) => QUESTION_KINDS[i % QUESTION_KINDS.length]);
  let order = shuffle(kinds, rng);
  for (let attempt = 0; attempt < 50 && order.some((k, i) => i > 0 && order[i - 1] === k); attempt++) {
    order = shuffle(kinds, rng);
  }
  return order;
}

function pickStyle(rng: () => number, weights: Rules["styleWeights"]): PairStyle {
  const entries = Object.entries(weights) as [PairStyle, number][];
  let roll = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [style, weight] of entries) {
    roll -= weight;
    if (roll < 0) return style;
  }
  return entries[entries.length - 1][0];
}

const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, "");

function toPicked(kind: QuestionKind, film: CandidateFilm): PickedFilm {
  const value = statOf(film, kind)!;
  return {
    tmdbId: film.tmdbId,
    title: film.title,
    year: yearOf(film),
    value,
    display: formatValue(kind, value),
    posterPath: film.posterPath,
  };
}

/**
 * A day's rounds from the candidate films. No film (or title, since remakes share one) appears twice.
 * Throws when the candidates can't fill the board, which only happens with far too few of them.
 */
export function pickRounds(
  films: CandidateFilm[],
  rng: () => number,
  rounds: number = RULES.doubleFeature.rounds,
  rules: Rules = RULES.doubleFeature.board,
): PickedRound[] {
  const usedTitles = new Set<string>();
  const result: PickedRound[] = [];
  for (const planned of questionOrder(rounds, rng)) {
    const style = pickStyle(rng, rules.styleWeights);
    const available = films.filter((f) => !usedTitles.has(titleKey(f.title)));
    // The planned kind first; if it has no fair pair left, any other kind will do.
    const kinds = [
      planned,
      ...shuffle(
        QUESTION_KINDS.filter((k) => k !== planned),
        rng,
      ),
    ];
    let chosen: { kind: QuestionKind; style: PairStyle; pair: [CandidateFilm, CandidateFilm] } | null = null;
    for (const kind of kinds) {
      const fair: [CandidateFilm, CandidateFilm][] = [];
      for (let i = 0; i < available.length; i++) {
        for (let j = i + 1; j < available.length; j++) {
          const a = available[i];
          const b = available[j];
          if (titleKey(a.title) !== titleKey(b.title) && isFairPair(kind, a, b, rules)) fair.push([a, b]);
        }
      }
      if (fair.length === 0) continue;
      const styled = fair.filter(([a, b]) => fitsStyle(style, kind, a, b, rules));
      const pool = styled.length > 0 ? styled : fair;
      // "Came out first" has no surprise of its own: those rounds are close calls.
      const kept = styled.length === 0 ? "open" : kind === "release" && style === "surprise" ? "close" : style;
      chosen = { kind, style: kept, pair: pool[Math.floor(rng() * pool.length)] };
      break;
    }
    if (!chosen) throw new Error(`Double Feature: no fair pair left for round ${result.length + 1}`);
    const { kind, pair } = chosen;
    const [winner, loser] = winnerOf(kind, pair[0], pair[1]) === 0 ? pair : [pair[1], pair[0]];
    // The seed decides which side the winner sits on.
    const correct: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const sides: [CandidateFilm, CandidateFilm] = correct === 0 ? [winner, loser] : [loser, winner];
    for (const f of sides) usedTitles.add(titleKey(f.title));
    result.push({ kind, style: chosen.style, films: [toPicked(kind, sides[0]), toPicked(kind, sides[1])], correct });
  }
  return result;
}
