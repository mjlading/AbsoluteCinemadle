import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import {
  alreadyGuessed,
  collageReducer,
  collageScore,
  currentRound,
  guessesLeft,
  initialCollageState,
  isFirstClueWin,
  maxCollageScore,
  type CollageAction,
  type CollageState,
} from "./state";

const answer = { title: "A Film", year: 2000, posterUrl: null };
const play = (...actions: CollageAction[]) => actions.reduce<CollageState>(collageReducer, initialCollageState());
const wrong = (text: string): CollageAction => ({ type: "guess", text, correct: false });
const right: CollageAction = { type: "guess", text: "A Film", correct: true, answer };
const skip: CollageAction = { type: "skip" };
const misses = (n: number): CollageAction[] => Array.from({ length: n }, (_, i) => wrong(`Film ${i}`));

describe("Close-Ups state", () => {
  it("starts on the first keyword with 5 guesses and nothing enhanced", () => {
    const state = play();
    expect(currentRound(state)).toBe(0);
    expect(guessesLeft(state)).toBe(RULES.closeUps.maxGuesses);
    expect(state.status).toBe("playing");
    expect(state.enhanced).toBeNull();
  });

  it("a miss or a skip opens the next keyword", () => {
    const state = play(wrong("Jaws"), skip);
    expect(currentRound(state)).toBe(2);
    expect(guessesLeft(state)).toBe(RULES.closeUps.maxGuesses - 2);
    expect(state.guesses).toEqual([
      { text: "Jaws", correct: false },
      { text: null, correct: false },
    ]);
  });

  it("scores 7 on the first clue, then 4, 3, 2, 1", () => {
    const scores = [0, 1, 2, 3, 4].map((n) => collageScore(play(...misses(n), right)));
    expect(scores).toEqual([7, 4, 3, 2, 1]);
    expect([0, 1, 2, 3, 4].map((n) => isFirstClueWin(play(...misses(n), right)))).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("is lost on the fifth miss or skip and scores 0", () => {
    const state = play(...misses(4), skip);
    expect(state.status).toBe("lost");
    expect(collageScore(state)).toBe(0);
    expect(currentRound(state)).toBe(RULES.closeUps.maxGuesses - 1);
    expect(isFirstClueWin(state)).toBe(false);
  });

  it("ignores a repeated guess", () => {
    const state = play(wrong("Jaws"), wrong("jaws!"));
    expect(state.guesses).toHaveLength(1);
    expect(alreadyGuessed(state, "JAWS")).toBe(true);
    expect(alreadyGuessed(state, "Heat")).toBe(false);
  });

  it("ignores everything once the game is over", () => {
    const won = play(right);
    expect(play(right, wrong("Heat"), skip, { type: "enhance", tileId: "t1" })).toEqual(won);
    const lost = play(...misses(5));
    expect(play(...misses(5), right, skip)).toEqual(lost);
  });

  it("allows one enhance per game", () => {
    const state = play({ type: "enhance", tileId: "t1" }, { type: "enhance", tileId: "t2" });
    expect(state.enhanced).toBe("t1");
  });

  it("the score comes from the scoring config", () => {
    expect(maxCollageScore()).toBe(POINTS.closeUps.start + POINTS.closeUps.firstClueBonus);
    expect(collageScore(play(wrong("Heat"), right))).toBe(POINTS.closeUps.start + POINTS.closeUps.perMissOrSkip);
  });

  it("reveals the answer on a lost game", () => {
    expect(play(...misses(5), { type: "reveal", answer }).answer).toEqual(answer);
  });
});
