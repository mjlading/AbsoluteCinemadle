import { POINTS } from "@/config/scoring";
import type { DoubleFeatureReveal } from "./types";

/*
 * A player's progress through one board, kept on their device: the rounds
 * answered so far, with the server's reveal for each, and the round on screen.
 */

export interface AnsweredRound extends DoubleFeatureReveal {
  picked: string;
}

export interface DoubleFeatureState {
  /** One entry per answered round, in order. */
  answers: AnsweredRound[];
  /** The round on screen; equal to the round count once the player moves on to the results. */
  current: number;
}

export type DoubleFeatureAction = { type: "answer"; round: number; answer: AnsweredRound } | { type: "next" };

export const initialDoubleFeatureState = (): DoubleFeatureState => ({ answers: [], current: 0 });

export function doubleFeatureReducer(rounds: number) {
  return (state: DoubleFeatureState, action: DoubleFeatureAction): DoubleFeatureState => {
    switch (action.type) {
      case "answer":
        // Only the round on screen, once.
        if (action.round !== state.current || state.answers.length !== state.current) return state;
        return { ...state, answers: [...state.answers, action.answer] };
      case "next":
        if (state.answers.length <= state.current || state.current >= rounds) return state;
        return { ...state, current: state.current + 1 };
    }
  };
}

export const isRight = (answer: AnsweredRound) => answer.picked === answer.correctOption;

export const scoreOf = (state: DoubleFeatureState) =>
  state.answers.filter(isRight).length * POINTS.doubleFeature.perCorrect;

export const isFinished = (state: DoubleFeatureState, rounds: number) => state.current >= rounds;

/** Right and wrong marks only, so it spoils nothing. */
export function doubleFeatureShareText(state: DoubleFeatureState, rounds: number, dateLabel: string): string {
  const marks = state.answers.map((a) => (isRight(a) ? "🟩" : "🟥")).join("");
  const right = state.answers.filter(isRight).length;
  return `Double Feature ${dateLabel}\n${marks} ${right}/${rounds}`;
}
