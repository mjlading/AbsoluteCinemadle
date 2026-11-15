import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import type { DeepCutReveal, FilmTitle, Misfit } from "./types";

/*
 * A player's progress through a day's prompts, kept on their device. Each prompt
 * is answered by one film that fits (scored), or ends with no points once its
 * tries run out; then the player moves on to the next.
 */

export type PromptOutcome =
  | ({ kind: "fit"; film: FilmTitle; score: number; percentile: number } & DeepCutReveal)
  | ({ kind: "out" } & DeepCutReveal);

export interface PromptState {
  misses: (FilmTitle & { why: Misfit })[];
  outcome: PromptOutcome | null;
}

export interface DeepCutState {
  /** The prompt on screen; equal to the number of prompts once the game is over. */
  current: number;
  prompts: PromptState[];
}

export type DeepCutAction =
  | { type: "miss"; prompt: number; film: FilmTitle; why: Misfit }
  | { type: "settle"; prompt: number; outcome: PromptOutcome }
  | { type: "next" };

export const initialDeepCutState = (count: number): DeepCutState => ({
  current: 0,
  prompts: Array.from({ length: count }, () => ({ misses: [], outcome: null })),
});

export const triesLeft = (p: PromptState) => Math.max(0, RULES.deepCut.triesPerPrompt - p.misses.length);

/** Out of tries but the answers not shown yet (the reveal is fetched next). */
export const needsReveal = (p: PromptState) => p.outcome === null && triesLeft(p) === 0;

export const alreadyMissed = (p: PromptState, tmdbId: number) => p.misses.some((m) => m.tmdbId === tmdbId);

export const isOver = (s: DeepCutState) => s.current >= s.prompts.length;

export const scoreOf = (p: PromptState) => (p.outcome?.kind === "fit" ? p.outcome.score : 0);

export const totalScore = (s: DeepCutState) => s.prompts.reduce((sum, p) => sum + scoreOf(p), 0);

export const maxTotal = (count: number) => count * POINTS.deepCut.max;

export function deepCutReducer(state: DeepCutState, action: DeepCutAction): DeepCutState {
  switch (action.type) {
    case "miss": {
      const p = state.prompts[action.prompt];
      if (!p || p.outcome || triesLeft(p) === 0 || alreadyMissed(p, action.film.tmdbId)) return state;
      return replace(state, action.prompt, { ...p, misses: [...p.misses, { ...action.film, why: action.why }] });
    }
    case "settle": {
      const p = state.prompts[action.prompt];
      if (!p || p.outcome) return state;
      if (action.outcome.kind === "out" && triesLeft(p) > 0) return state;
      return replace(state, action.prompt, { ...p, outcome: action.outcome });
    }
    case "next": {
      const p = state.prompts[state.current];
      if (!p?.outcome) return state;
      return { ...state, current: state.current + 1 };
    }
  }
}

function replace(state: DeepCutState, index: number, prompt: PromptState): DeepCutState {
  return { ...state, prompts: state.prompts.map((p, i) => (i === index ? prompt : p)) };
}

/** The plain sentence that places a fitting answer among the others. */
export function placing(score: number, percentile: number): string {
  if (score === 0) return "The most obvious answer there is.";
  if (percentile < 1) return "One of the best-known films that fit.";
  if (percentile >= 99) return "Rarer than nearly every film that fits.";
  return `Rarer than ${percentile}% of the films that fit.`;
}

/** The spoiler-free result: the prompts and their scores, no films. */
export function deepCutShareText(date: string, prompts: readonly string[], state: DeepCutState, url: string): string {
  const lines = prompts.map((text, i) => {
    const p = state.prompts[i];
    return `${text}: ${p?.outcome?.kind === "fit" ? p.outcome.score : "0 (no fit)"}`;
  });
  return [`Deep Cut ${date}`, ...lines, `${totalScore(state)}/${maxTotal(prompts.length)}`, url].join("\n");
}
