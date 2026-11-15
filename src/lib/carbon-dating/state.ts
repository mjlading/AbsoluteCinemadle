import type { CarbonRoundResult } from "./game";

/*
 * A Carbon Dating game in progress, as the client keeps it: the rounds played
 * so far and the round on screen. A round whose result is in but whose
 * position hasn't moved on yet is showing its reveal.
 */

export interface CarbonState {
  results: CarbonRoundResult[];
  /** The round on screen; equal to the number of rounds once the recap shows. */
  position: number;
}

export type CarbonAction = { type: "revealed"; result: CarbonRoundResult } | { type: "next" };

export const initialCarbonState = (): CarbonState => ({ results: [], position: 0 });

export function carbonReducer(rounds: number) {
  return (state: CarbonState, action: CarbonAction): CarbonState => {
    switch (action.type) {
      case "revealed":
        // Only the round on screen can be guessed, and only once.
        if (state.results.length !== state.position || state.position >= rounds) return state;
        return { ...state, results: [...state.results, action.result] };
      case "next":
        if (state.results.length !== state.position + 1) return state;
        return { ...state, position: state.position + 1 };
    }
  };
}
