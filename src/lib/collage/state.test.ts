import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import {
  alreadyGuessed,
  canUnlock,
  collageReducer,
  collageScore,
  guessesLeft,
  initialCollageState,
  unlockCost,
  type CollageAction,
  type CollageState,
} from "./state";
import type { CollageTier, PublicCollagePuzzle } from "./types";

const keyword = (id: string, tier: CollageTier, free = false) => ({
  id,
  label: id,
  tier,
  free,
  cost: free ? 0 : unlockCost(tier),
  tiles: [1, 2, 3, 4].map((n) => ({ id: `${id}-${n}`, number: n, imageUrl: "", enhancedUrl: "" })),
});

const puzzle: PublicCollagePuzzle = {
  id: "p1",
  name: "Demo 1",
  keywords: [
    keyword("hands", "hard", true),
    keyword("doors", "hard"),
    keyword("food", "medium"),
    keyword("mouths", "easy"),
  ],
};
const answer = { title: "A Film", year: 2000, posterUrl: null };
const play = (...actions: CollageAction[]) =>
  actions.reduce<CollageState>(collageReducer(puzzle), initialCollageState(puzzle));
const wrong = (text: string): CollageAction => ({ type: "guess", text, correct: false });

describe("keyword collage state", () => {
  it("starts with only the free keyword open and the full points", () => {
    const state = play();
    expect(state.unlocked).toEqual(["hands"]);
    expect(collageScore(puzzle, state)).toBe(POINTS.keywordCollage.start);
    expect(guessesLeft(state)).toBe(RULES.keywordCollage.maxGuesses);
  });

  it("charges each keyword's tier cost once", () => {
    const state = play({ type: "unlock", keywordId: "food" }, { type: "unlock", keywordId: "food" });
    expect(state.unlocked).toEqual(["hands", "food"]);
    expect(collageScore(puzzle, state)).toBe(POINTS.keywordCollage.start + POINTS.keywordCollage.unlock.medium);
  });

  it("charges wrong guesses and ignores a repeated one", () => {
    const state = play(wrong("Alien"), wrong("alien!"), wrong("Heat"));
    expect(state.guesses.map((g) => g.text)).toEqual(["Alien", "Heat"]);
    expect(collageScore(puzzle, state)).toBe(POINTS.keywordCollage.start + 2 * POINTS.keywordCollage.perWrongGuess);
    expect(alreadyGuessed(state, "ALIEN")).toBe(true);
  });

  it("is won by a right guess, keeping the points left", () => {
    const state = play({ type: "unlock", keywordId: "doors" }, wrong("Heat"), {
      type: "guess",
      text: "A Film",
      correct: true,
      answer,
    });
    expect(state.status).toBe("won");
    expect(state.answer).toEqual(answer);
    expect(collageScore(puzzle, state)).toBe(
      POINTS.keywordCollage.start + POINTS.keywordCollage.unlock.hard + POINTS.keywordCollage.perWrongGuess,
    );
  });

  it("is lost after the last wrong guess, and a lost game scores zero", () => {
    const guesses = Array.from({ length: RULES.keywordCollage.maxGuesses }, (_, i) => wrong(`Film ${i}`));
    const state = play(...guesses);
    expect(state.status).toBe("lost");
    expect(collageScore(puzzle, state)).toBe(0);
    expect(play(...guesses, { type: "guess", text: "A Film", correct: true, answer }).status).toBe("lost");
  });

  it("can be given up, and nothing changes after that", () => {
    const state = play(
      { type: "give_up" },
      { type: "unlock", keywordId: "doors" },
      { type: "enhance", tileId: "hands-1" },
    );
    expect(state.status).toBe("lost");
    expect(state.unlocked).toEqual(["hands"]);
    expect(state.enhanced).toBeNull();
  });

  it("allows one enhance per game", () => {
    const state = play({ type: "enhance", tileId: "hands-1" }, { type: "enhance", tileId: "hands-2" });
    expect(state.enhanced).toBe("hands-1");
  });

  it("refuses a keyword the player can no longer afford", () => {
    const rich = { ...puzzle, keywords: [...puzzle.keywords, keyword("hair", "easy"), keyword("signs", "easy")] };
    const reduce = collageReducer(rich);
    let state = initialCollageState(rich);
    for (const id of ["mouths", "hair", "food"]) state = reduce(state, { type: "unlock", keywordId: id });
    // 1000 - 350 - 350 - 200 = 100 left: a 100-point keyword fits, a 350-point one does not.
    expect(collageScore(rich, state)).toBe(100);
    expect(canUnlock(rich, state, "signs")).toBe(false);
    expect(canUnlock(rich, state, "doors")).toBe(true);
    state = reduce(state, { type: "unlock", keywordId: "signs" });
    expect(state.unlocked).not.toContain("signs");
  });
});
