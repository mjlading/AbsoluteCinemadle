import type { GuessPick, PublicSoundbytesBoard, SoundbytesAnswer } from "./types";

/*
 * A Soundbytes game as the player's browser keeps it, played like Heardle:
 * line 1 is open from the start, and every try that misses (a wrong guess or
 * a skip) opens the next line. A miss with every line open ends the game.
 * Getting it early feels better, but what counts is not failing.
 *
 * A right actor is not a miss: it is free and gets pinned to the board as a
 * hint, but only the film wins. The server only checks guesses and hands out
 * the answer once it is earned.
 */

export type GuessRecord =
  | {
      kind: GuessPick["kind"];
      tmdbId: number;
      /** The film's title or the person's name, as picked. */
      name: string;
      correct: boolean;
    }
  | { kind: "skip" };

/** A try that named a film or an actor. */
export type Guess = Exclude<GuessRecord, { kind: "skip" }>;

export interface SoundbytesState {
  /** False until the player first taps line 1; nothing counts before that. */
  started: boolean;
  /** Every try in order, skips included. */
  guesses: GuessRecord[];
  status: "playing" | "won" | "lost";
  /** Set once the game is over: earned by a right guess, or revealed on a loss. */
  answer: SoundbytesAnswer | null;
}

export type SoundbytesAction =
  | { type: "start" }
  | { type: "guess"; pick: GuessPick; correct: boolean; answer?: SoundbytesAnswer }
  | { type: "skip" }
  | { type: "show_answer"; answer: SoundbytesAnswer };

export function initialSoundbytesState(): SoundbytesState {
  return { started: false, guesses: [], status: "playing", answer: null };
}

export const pickName = (pick: GuessPick) => (pick.kind === "film" ? pick.title : pick.name);

const isMiss = (g: GuessRecord) => g.kind === "skip" || !g.correct;

/** Tries that missed: wrong guesses and skips. */
export const misses = (state: SoundbytesState) => state.guesses.filter(isMiss).length;

/** How many lines are open: one, plus one per miss, up to all of them; all once the game is over. */
export function linesOpen(board: PublicSoundbytesBoard, state: SoundbytesState): number {
  if (state.status !== "playing") return board.nodes.length;
  return Math.min(board.nodes.length, misses(state) + 1);
}

/** Tries left before the game is lost: one per line, less the misses. */
export const triesLeft = (board: PublicSoundbytesBoard, state: SoundbytesState) => board.nodes.length - misses(state);

/** The line the film was named on, 1-based: how many lines were open then. */
export const wonOnLine = (state: SoundbytesState) => misses(state) + 1;

/**
 * How each line's try went, by slot: `spent` on a miss, `won` where the film was named,
 * `current` for the newest open line while playing, `locked` for lines not open yet.
 * The board marks its labels with these, so it is also the try counter.
 */
export type LineMark = "spent" | "won" | "current" | "locked";

export function lineMarks(board: PublicSoundbytesBoard, state: SoundbytesState): LineMark[] {
  const missed = misses(state);
  return board.nodes.map((_, i) =>
    i < missed ? "spent" : i > missed ? "locked" : state.status === "won" ? "won" : "current",
  );
}

export const correctActors = (state: SoundbytesState) =>
  state.guesses.filter((g): g is Guess => g.kind === "person" && g.correct);

/** A pick already guessed is turned away for free. */
export const alreadyGuessed = (state: SoundbytesState, pick: GuessPick) =>
  state.guesses.some((g) => g.kind === pick.kind && g.tmdbId === pick.tmdbId);

export function soundbytesReducer(board: PublicSoundbytesBoard) {
  /** A miss with every line already open is the last try. */
  const afterMiss = (next: SoundbytesState): SoundbytesState =>
    misses(next) >= board.nodes.length ? { ...next, status: "lost" } : next;

  return (state: SoundbytesState, action: SoundbytesAction): SoundbytesState => {
    switch (action.type) {
      case "start":
        return { ...state, started: true };
      case "guess": {
        if (!state.started || state.status !== "playing" || alreadyGuessed(state, action.pick)) return state;
        const record: GuessRecord = {
          kind: action.pick.kind,
          tmdbId: action.pick.tmdbId,
          name: pickName(action.pick),
          correct: action.correct,
        };
        const next = { ...state, guesses: [...state.guesses, record] };
        if (action.correct && action.pick.kind === "film") {
          return { ...next, status: "won", answer: action.answer ?? null };
        }
        return action.correct ? next : afterMiss(next);
      }
      case "skip":
        if (!state.started || state.status !== "playing") return state;
        return afterMiss({ ...state, guesses: [...state.guesses, { kind: "skip" }] });
      case "show_answer":
        return { ...state, answer: action.answer };
    }
  };
}
