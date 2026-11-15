import type { HowOldReveal } from "./types";

/*
 * A player's progress through one board, kept in localStorage. `current` is
 * the round on screen; once its reveal is in `results`, Next moves on, and
 * after the last round `current` equals the round count (the end screen).
 */

export interface HowOldResult extends HowOldReveal {
  guess: number;
}

export interface HowOldState {
  current: number;
  results: HowOldResult[];
}

export type HowOldAction = { type: "reveal"; result: HowOldResult } | { type: "next" };

export const initialHowOldState = (): HowOldState => ({ current: 0, results: [] });

export function howOldReducer(rounds: number) {
  return (state: HowOldState, action: HowOldAction): HowOldState => {
    switch (action.type) {
      case "reveal":
        // Only the round on screen, once.
        return state.results.length === state.current && state.current < rounds
          ? { ...state, results: [...state.results, action.result] }
          : state;
      case "next":
        return state.results.length > state.current ? { ...state, current: state.current + 1 } : state;
    }
  };
}
