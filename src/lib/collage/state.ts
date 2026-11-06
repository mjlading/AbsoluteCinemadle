import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { normalizeTitle } from "@/lib/warmup/match";
import type { CollageAnswer, CollageTier, PublicCollagePuzzle } from "./types";

/*
 * A keyword collage game as the player's browser keeps it. The server only
 * checks guesses and hands out the answer once it is earned; points are
 * tracked here, so a determined player can only cheat their own score.
 */

export interface CollageState {
  /** Keywords the player has opened, in order; the free one is always first. */
  unlocked: string[];
  /** Every guess, in order. */
  guesses: { text: string; correct: boolean }[];
  /** The tile "Enhance" was used on, if any. */
  enhanced: string | null;
  status: "playing" | "won" | "lost";
  /** Set once the game is over: earned by a right guess, or revealed on a loss. */
  answer: CollageAnswer | null;
}

export type CollageAction =
  | { type: "unlock"; keywordId: string }
  | { type: "enhance"; tileId: string }
  | { type: "guess"; text: string; correct: boolean; answer?: CollageAnswer }
  | { type: "give_up" }
  | { type: "reveal"; answer: CollageAnswer };

export const unlockCost = (tier: CollageTier): number => -POINTS.keywordCollage.unlock[tier];

export function initialCollageState(puzzle: PublicCollagePuzzle): CollageState {
  return {
    unlocked: puzzle.keywords.filter((k) => k.free).map((k) => k.id),
    guesses: [],
    enhanced: null,
    status: "playing",
    answer: null,
  };
}

export const wrongGuesses = (state: CollageState) => state.guesses.filter((g) => !g.correct).length;

export const guessesLeft = (state: CollageState) => RULES.keywordCollage.maxGuesses - wrongGuesses(state);

/** Points left: the start, less every unlocked keyword and wrong guess; never below zero, and zero for a loss. */
export function collageScore(puzzle: PublicCollagePuzzle, state: CollageState): number {
  if (state.status === "lost") return 0;
  const spent = state.unlocked.reduce((sum, id) => sum + (puzzle.keywords.find((k) => k.id === id)?.cost ?? 0), 0);
  return Math.max(0, POINTS.keywordCollage.start - spent + wrongGuesses(state) * POINTS.keywordCollage.perWrongGuess);
}

/** Whether the player can still open this keyword: the game is on, it is locked, and they can afford it. */
export function canUnlock(puzzle: PublicCollagePuzzle, state: CollageState, keywordId: string): boolean {
  const keyword = puzzle.keywords.find((k) => k.id === keywordId);
  return (
    state.status === "playing" &&
    !!keyword &&
    !state.unlocked.includes(keywordId) &&
    collageScore(puzzle, state) >= keyword.cost
  );
}

/** A guess the player already made (ignoring case, accents and the like) is turned away for free. */
export const alreadyGuessed = (state: CollageState, text: string) =>
  state.guesses.some((g) => normalizeTitle(g.text) === normalizeTitle(text));

export function collageReducer(puzzle: PublicCollagePuzzle) {
  return (state: CollageState, action: CollageAction): CollageState => {
    switch (action.type) {
      case "unlock":
        return canUnlock(puzzle, state, action.keywordId)
          ? { ...state, unlocked: [...state.unlocked, action.keywordId] }
          : state;
      case "enhance":
        return state.status === "playing" && state.enhanced === null ? { ...state, enhanced: action.tileId } : state;
      case "guess": {
        if (state.status !== "playing" || alreadyGuessed(state, action.text)) return state;
        const next = { ...state, guesses: [...state.guesses, { text: action.text, correct: action.correct }] };
        if (action.correct) return { ...next, status: "won", answer: action.answer ?? null };
        return guessesLeft(next) <= 0 ? { ...next, status: "lost" } : next;
      }
      case "give_up":
        return state.status === "playing" ? { ...state, status: "lost" } : state;
      case "reveal":
        return { ...state, answer: action.answer };
    }
  };
}
