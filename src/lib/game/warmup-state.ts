import { RULES } from "@/config/rules";
import type { PublicWarmupCard, WarmupAnswer } from "@/lib/puzzle/types";

export type WarmupPhase = "intro" | "countdown" | "playing" | "over";

export interface WarmupState {
  phase: WarmupPhase;
  /** Cards still to answer; the first one is on screen. Skipped cards go to the back. */
  queue: string[];
  /** Cards the player skipped at least once. */
  skipped: string[];
  /** Answers the player found, by card id. */
  found: Record<string, WarmupAnswer>;
  /** Answers shown after the round for cards the player missed, by card id. */
  revealed: Record<string, WarmupAnswer>;
  wrongGuesses: number;
  /** When the clock runs out, in epoch milliseconds; set when play starts. */
  endsAt: number | null;
}

export type WarmupAction =
  | { type: "start" }
  | { type: "begin"; now: number }
  | { type: "found"; cardId: string; answer: WarmupAnswer }
  | { type: "wrong" }
  | { type: "skip" }
  | { type: "end" }
  | { type: "reveal"; answers: WarmupAnswer[] };

export function initialWarmupState(cards: PublicWarmupCard[]): WarmupState {
  return {
    phase: "intro",
    queue: cards.map((c) => c.id),
    skipped: [],
    found: {},
    revealed: {},
    wrongGuesses: 0,
    endsAt: null,
  };
}

export const currentCardId = (state: WarmupState): string | null =>
  state.phase === "playing" ? (state.queue[0] ?? null) : null;

export const foundCount = (state: WarmupState): number => Object.keys(state.found).length;

export function warmupReducer(state: WarmupState, action: WarmupAction): WarmupState {
  switch (action.type) {
    case "start":
      return state.phase === "intro" ? { ...state, phase: "countdown" } : state;

    case "begin":
      if (state.phase !== "countdown") return state;
      return { ...state, phase: "playing", endsAt: action.now + RULES.warmup.timeLimitSeconds * 1000 };

    case "found": {
      if (state.phase !== "playing" || !state.queue.includes(action.cardId)) return state;
      const queue = state.queue.filter((id) => id !== action.cardId);
      return {
        ...state,
        queue,
        found: { ...state.found, [action.cardId]: action.answer },
        phase: queue.length === 0 ? "over" : "playing",
      };
    }

    case "wrong":
      return state.phase === "playing" ? { ...state, wrongGuesses: state.wrongGuesses + 1 } : state;

    case "skip": {
      if (state.phase !== "playing" || state.queue.length < 2) return state;
      const [current, ...rest] = state.queue;
      return {
        ...state,
        queue: [...rest, current],
        skipped: state.skipped.includes(current) ? state.skipped : [...state.skipped, current],
      };
    }

    case "end":
      return state.phase === "playing" || state.phase === "countdown" ? { ...state, phase: "over" } : state;

    case "reveal": {
      if (state.phase !== "over") return state;
      const revealed = Object.fromEntries(
        action.answers.filter((a) => !state.found[a.cardId]).map((a) => [a.cardId, a] as const),
      );
      return { ...state, revealed };
    }
  }
}
