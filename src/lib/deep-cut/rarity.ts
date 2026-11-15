import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";

/*
 * How rare an answer is. There are no players to count yet, so rarity is
 * estimated from fame: a film's TMDB vote count. `fame` is the one place that
 * says so; real guess counts can replace it later without touching the scale.
 */

const FLOOR = RULES.deepCut.board.voteFloor;
const MAX = POINTS.deepCut.max;
const CURVE = POINTS.deepCut.curve;

/** How often people would name a film, as a number where more is more obvious. Today: its TMDB vote count. */
export function fame(film: { voteCount: number }): number {
  return film.voteCount;
}

/**
 * The fame of the films that fit a prompt, as the scale needs it: the most famous
 * fitting film, the highest fames in order (as deep as the board read), and how many
 * fitting films reach the floor in all.
 */
export interface RarityScale {
  /** The most obvious answer's fame: it scores 0. */
  top: number;
  /** Fames of fitting films at or above the floor, most first; may stop before `total`. */
  fames: number[];
  /** How many fitting films are at or above the floor. */
  total: number;
}

/**
 * Points for an answer: its place on a log scale between the set's most famous
 * film (0) and the floor (MAX), bent by the curve. A log scale, so the second most
 * famous answer is worth a little, not half; below the floor it stops paying more.
 */
export function rarityScore(answerFame: number, top: number, floor: number = FLOOR, max: number = MAX): number {
  if (top <= floor) return answerFame >= top ? 0 : max;
  const f = Math.max(answerFame, 1);
  const t = Math.log(top / f) / Math.log(top / floor);
  return Math.round(max * Math.min(1, Math.max(0, t)) ** CURVE);
}

/** The most fame an answer can have and still score `score`: the inverse of rarityScore. */
export function fameForScore(score: number, top: number, floor: number = FLOOR, max: number = MAX): number {
  if (top <= floor) return top;
  const t = Math.min(1, Math.max(0, score / max)) ** (1 / CURVE);
  return Math.floor(top * (floor / top) ** t);
}

/**
 * How many of the films that fit are more famous than this one, as a whole
 * percentage of them. Past the depth the board read, the rest are taken to be
 * spread evenly on the log scale down to the floor.
 */
export function percentRarerThan(answerFame: number, scale: RarityScale, floor: number = FLOOR): number {
  const { fames, total } = scale;
  if (total <= 0) return 0;
  let more = fames.filter((f) => f > answerFame).length;
  const last = fames.at(-1);
  if (more === fames.length && last !== undefined && total > fames.length) {
    const tail = total - fames.length;
    if (answerFame < floor) more = total;
    else if (last > floor) more += Math.round(tail * Math.min(1, Math.log(last / answerFame) / Math.log(last / floor)));
  } else if (answerFame < floor) {
    more = total;
  }
  return Math.min(100, Math.floor((100 * more) / total));
}
