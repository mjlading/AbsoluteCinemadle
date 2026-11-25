import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { castingCallReducer, initialCastingCallState } from "@/lib/casting-call/state";
import { collageReducer, collageScore, currentRound, initialCollageState } from "@/lib/collage/state";
import type { LeaderboardResult } from "./types";

/*
 * Each game's result rebuilt from the player's moves, with every move judged
 * again by the server's own check. A client can only send what it played; the
 * score is never taken from it. Each function returns null for a game that isn't over.
 */

/** Close-Ups: the guesses in order (null for a skip); `isRight` is the server's guess check. */
export function replayCloseUps(
  guesses: readonly ({ text: string; tmdbId?: number } | null)[],
  isRight: (text: string, tmdbId?: number) => boolean,
): LeaderboardResult | null {
  let state = initialCollageState();
  for (const g of guesses) {
    if (state.status !== "playing") return null; // moves after the end: not a game the client could have played
    state =
      g === null
        ? collageReducer(state, { type: "skip" })
        : collageReducer(state, { type: "guess", text: g.text, correct: isRight(g.text, g.tmdbId) });
  }
  if (state.status === "playing") return null;
  const won = state.status === "won";
  return {
    score: collageScore(state),
    won,
    summary: won ? `Clue ${currentRound(state) + 1}/${RULES.closeUps.keywordsPerPuzzle}` : "Missed",
  };
}

/**
 * Casting call: the faces (board positions) each guessed film crossed out, in order, as the
 * server found them. The clock can't be checked afterwards, so a loss to it is taken on trust:
 * it can only lower a result.
 */
export function replayCastingCall(
  filmFaces: readonly string[][],
  timedOut: boolean,
  faceCount: number = RULES.castingCall.faceCount,
): LeaderboardResult | null {
  const reduce = castingCallReducer(faceCount);
  let state = reduce(initialCastingCallState(), { type: "start", now: 0, faces: [] });
  filmFaces.forEach((faces, i) => {
    if (state.status !== "playing") return;
    state = reduce(state, {
      type: "guess",
      now: 0,
      result: { film: { tmdbId: i + 1, title: "", year: null }, found: faces.map((faceId) => ({ faceId, name: "" })) },
    });
  });
  if (state.status === "playing" && timedOut) state = reduce(state, { type: "timeUp" });
  if (state.status === "playing") return null;
  const won = state.status === "won";
  const left = RULES.castingCall.maxGuesses - state.guesses.length;
  const { perFace, perGuessLeftOnWin } = POINTS.castingCall;
  return {
    score: state.crossed.length * perFace + (won ? left * perGuessLeftOnWin : 0),
    won,
    summary: won ? `${faceCount}/${faceCount} in ${state.guesses.length}` : `${state.crossed.length}/${faceCount}`,
  };
}

/** Ratings Cliff: the option picked in each round, against each round's right option. */
export function replayRatingsCliff(picks: readonly string[], answers: readonly string[]): LeaderboardResult | null {
  if (picks.length !== answers.length) return null;
  const right = picks.filter((p, i) => p === answers[i]).length;
  return {
    score: right * POINTS.ratingsCliff.perCorrect,
    won: right === answers.length,
    summary: `${right}/${answers.length}`,
  };
}
