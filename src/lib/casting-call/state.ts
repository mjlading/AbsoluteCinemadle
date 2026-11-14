import { RULES } from "@/config/rules";
import type { CastingGuessResult, FoundFace } from "./types";

export type CastingStatus = "ready" | "playing" | "won" | "lost";

export interface CastingCallState {
  status: CastingStatus;
  /** Every film guessed, in order, with the faces it crossed out (new or not). */
  guesses: { film: CastingGuessResult["film"]; faceIds: string[] }[];
  /** Every face's name, once the player has pressed Start. */
  names: Record<string, string>;
  /** Faces crossed out, in the order they were found. */
  crossed: string[];
  /** Faces the player fired: done without being found, and never crossed out after. */
  fired: string[];
  /** When the bar runs out, in epoch ms, so a reload can't refill it; null before Start. */
  deadline: number | null;
  /** The game was lost to the clock, not by running out of guesses. */
  timedOut: boolean;
}

export type CastingCallAction =
  | { type: "start"; now: number; faces: FoundFace[] }
  /** `now` is when the film was submitted, so time spent checking it isn't charged to the player. */
  | { type: "guess"; now: number; result: CastingGuessResult }
  /** Takes an actor off the board as done, without a guess; the bar runs on. */
  | { type: "fire"; faceId: string }
  | { type: "timeUp" };

const TIME_LIMIT_MS = RULES.castingCall.timeLimitSeconds * 1000;

export const initialCastingCallState = (): CastingCallState => ({
  status: "ready",
  guesses: [],
  names: {},
  crossed: [],
  fired: [],
  deadline: null,
  timedOut: false,
});

/**
 * A game left in progress before the clock existed has no deadline; it starts over.
 * Games saved before firing existed have no `fired` list; they had fired nobody.
 */
export function reviveCastingCallState(stored: CastingCallState): CastingCallState {
  if (stored.status === "playing" && typeof stored.deadline !== "number") return initialCastingCallState();
  return Array.isArray(stored.fired) ? stored : { ...stored, fired: [] };
}

/** Faces that are done: crossed out or fired. */
const doneCount = (state: Pick<CastingCallState, "crossed" | "fired">) => state.crossed.length + state.fired.length;

export function castingCallReducer(faceCount: number = RULES.castingCall.faceCount) {
  return (state: CastingCallState, action: CastingCallAction): CastingCallState => {
    switch (action.type) {
      case "start": {
        if (state.status !== "ready") return state;
        const names = Object.fromEntries(action.faces.map((f) => [f.faceId, f.name]));
        return { ...state, status: "playing", names, deadline: action.now + TIME_LIMIT_MS };
      }
      case "timeUp":
        return state.status === "playing" ? { ...state, status: "lost", timedOut: true } : state;
      case "fire": {
        const { faceId } = action;
        if (state.status !== "playing" || firesLeft(state) <= 0 || isDone(state, faceId)) return state;
        if (!(faceId in state.names)) return state;
        const fired = [...state.fired, faceId];
        return {
          ...state,
          fired,
          status: doneCount({ crossed: state.crossed, fired }) >= faceCount ? "won" : "playing",
        };
      }
      case "guess": {
        const { film, found } = action.result;
        if (state.status !== "playing" || alreadyGuessed(state, film.tmdbId)) return state;
        const crossed = [...state.crossed];
        for (const face of found) {
          if (!crossed.includes(face.faceId) && !state.fired.includes(face.faceId)) crossed.push(face.faceId);
        }
        const guesses = [...state.guesses, { film, faceIds: found.map((f) => f.faceId) }];
        const status: CastingStatus =
          doneCount({ crossed, fired: state.fired }) >= faceCount
            ? "won"
            : guesses.length >= RULES.castingCall.maxGuesses
              ? "lost"
              : "playing";
        // Any film with someone from the board refills the bar, even if they were already crossed out.
        const deadline = found.length > 0 ? action.now + TIME_LIMIT_MS : state.deadline;
        return { ...state, status, guesses, crossed, deadline };
      }
    }
  };
}

export const alreadyGuessed = (state: CastingCallState, tmdbId: number) =>
  state.guesses.some((g) => g.film.tmdbId === tmdbId);

export const guessesLeft = (state: CastingCallState) => RULES.castingCall.maxGuesses - state.guesses.length;

export const firesLeft = (state: CastingCallState) => RULES.castingCall.firesPerGame - state.fired.length;

/** Crossed out or fired. */
export const isDone = (state: CastingCallState, faceId: string) =>
  state.crossed.includes(faceId) || state.fired.includes(faceId);

/** Milliseconds left on the bar; a full bar before Start. */
export function msLeft(state: CastingCallState, now: number): number {
  if (state.deadline === null) return TIME_LIMIT_MS;
  return Math.max(0, Math.min(TIME_LIMIT_MS, state.deadline - now));
}

/** Faces a guess crossed out for the first time; a fired face is never crossed out. */
export function newlyCrossed(state: CastingCallState, guessIndex: number): string[] {
  const before = new Set(state.guesses.slice(0, guessIndex).flatMap((g) => g.faceIds));
  return (state.guesses[guessIndex]?.faceIds ?? []).filter((id) => !before.has(id) && !state.fired.includes(id));
}

/**
 * The share text: the day's title and guesses used ("X" for a loss), a flame
 * for each actor fired, then one square per guess (green crossed someone new,
 * red didn't) and black for guesses left.
 */
export function castingShareText(title: string, state: CastingCallState): string {
  const max = RULES.castingCall.maxGuesses;
  const squares: string[] = state.guesses.map((_, i) => (newlyCrossed(state, i).length > 0 ? "🟩" : "🟥"));
  while (squares.length < max) squares.push("⬛");
  const result = state.status === "won" ? state.guesses.length : "X";
  const fired = "🔥".repeat(state.fired.length);
  return `${title} ${result}/${max}${fired ? ` ${fired}` : ""}\n${squares.join("")}`;
}
