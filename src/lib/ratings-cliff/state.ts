import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import type { RatingsCliffGuessResult } from "./types";

/*
 * A player's progress through a day's board: each round is picked once, its
 * reveal shown, then the player moves on. Kept on the device by the game.
 */

export interface RoundAnswer {
  option: string;
  result: RatingsCliffGuessResult;
}

export interface RatingsCliffState {
  answers: RoundAnswer[];
  /** Rounds the player has moved past; the round on screen is this one. */
  advanced: number;
}

export type RatingsCliffAction = { type: "answered"; round: number; answer: RoundAnswer } | { type: "next" };

export const initialRatingsCliffState = (): RatingsCliffState => ({ answers: [], advanced: 0 });

export function ratingsCliffReducer(rounds: number = RULES.ratingsCliff.rounds) {
  return (state: RatingsCliffState, action: RatingsCliffAction): RatingsCliffState => {
    switch (action.type) {
      case "answered":
        // A pick for any round but the open one (a double click, a stale response) changes nothing.
        if (action.round !== state.answers.length || action.round !== state.advanced || action.round >= rounds) {
          return state;
        }
        return { ...state, answers: [...state.answers, action.answer] };
      case "next":
        return state.answers.length > state.advanced ? { ...state, advanced: state.advanced + 1 } : state;
    }
  };
}

export const isCorrect = (a: RoundAnswer) => a.option === a.result.correctOption;

export const isFinished = (state: RatingsCliffState, rounds: number = RULES.ratingsCliff.rounds) =>
  state.advanced >= rounds;

export const correctCount = (state: RatingsCliffState) => state.answers.filter(isCorrect).length;

export const ratingsCliffScore = (state: RatingsCliffState) => correctCount(state) * POINTS.ratingsCliff.perCorrect;

/** Spoiler-free share text: the date, a mark per round and the score. */
export function ratingsCliffShareText(
  date: string,
  state: RatingsCliffState,
  rounds: number = RULES.ratingsCliff.rounds,
): string {
  const marks = state.answers.map((a) => (isCorrect(a) ? "🟩" : "🟥")).join("");
  return `Ratings Cliff ${date}\n${marks} ${correctCount(state)}/${rounds}`;
}
