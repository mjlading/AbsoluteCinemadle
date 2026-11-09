import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { normalizeTitle } from "@/lib/warmup/match";
import type { CollageAnswer } from "./types";

/*
 * A Close-Ups game as the player's browser keeps it. The server only checks
 * guesses and hands out the answer once it is earned; points are tracked
 * here, so a determined player can only cheat their own score.
 */

export interface CollageState {
  /** Every guess in order; `text: null` is a skip. */
  guesses: { text: string | null; correct: boolean }[];
  /** The tile "Enhance" was used on, if any. */
  enhanced: string | null;
  status: "playing" | "won" | "lost";
  /** Set once the game is over: earned by a right guess, or revealed on a loss. */
  answer: CollageAnswer | null;
}

export type CollageAction =
  | { type: "guess"; text: string; correct: boolean; answer?: CollageAnswer }
  | { type: "skip" }
  | { type: "enhance"; tileId: string }
  | { type: "reveal"; answer: CollageAnswer };

export function initialCollageState(): CollageState {
  return { guesses: [], enhanced: null, status: "playing", answer: null };
}

const missesAndSkips = (state: CollageState) => state.guesses.filter((g) => !g.correct).length;

/** The 0-based index of the open keyword: one more for every miss or skip. */
export const currentRound = (state: CollageState) =>
  Math.min(missesAndSkips(state), RULES.closeUps.maxGuesses - 1);

export const guessesLeft = (state: CollageState) => RULES.closeUps.maxGuesses - missesAndSkips(state);

/** Points for the game: the start less one per earlier miss or skip, plus a bonus for a first-clue win; zero for a loss. */
export function collageScore(state: CollageState): number {
  if (state.status !== "won") return 0;
  const { start, perMissOrSkip, firstClueBonus } = POINTS.closeUps;
  const round = currentRound(state);
  return start + perMissOrSkip * round + (round === 0 ? firstClueBonus : 0);
}

export const isFirstClueWin = (state: CollageState) => state.status === "won" && currentRound(state) === 0;

/** The best score a game can reach, for the share text. */
export const maxCollageScore = () => POINTS.closeUps.start + POINTS.closeUps.firstClueBonus;

/** A guess the player already made (ignoring case, accents and the like) is turned away for free. */
export const alreadyGuessed = (state: CollageState, text: string) =>
  state.guesses.some((g) => g.text !== null && normalizeTitle(g.text) === normalizeTitle(text));

export function collageReducer(state: CollageState, action: CollageAction): CollageState {
  switch (action.type) {
    case "enhance":
      return state.status === "playing" && state.enhanced === null ? { ...state, enhanced: action.tileId } : state;
    case "guess": {
      if (state.status !== "playing" || alreadyGuessed(state, action.text)) return state;
      const next = { ...state, guesses: [...state.guesses, { text: action.text, correct: action.correct }] };
      if (action.correct) return { ...next, status: "won", answer: action.answer ?? null };
      return guessesLeft(next) <= 0 ? { ...next, status: "lost" } : next;
    }
    case "skip": {
      if (state.status !== "playing") return state;
      const next = { ...state, guesses: [...state.guesses, { text: null, correct: false }] };
      return guessesLeft(next) <= 0 ? { ...next, status: "lost" } : next;
    }
    case "reveal":
      return { ...state, answer: action.answer };
  }
}
