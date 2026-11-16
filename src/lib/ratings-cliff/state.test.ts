import { describe, expect, it } from "vitest";

import {
  correctCount,
  initialRatingsCliffState,
  isFinished,
  ratingsCliffReducer,
  ratingsCliffShareText,
  type RoundAnswer,
} from "./state";

const answer = (option: string, correct: string): RoundAnswer => ({
  option,
  result: { correctOption: correct, series: "Some Show (2001–2005)", reveal: "..." },
});

describe("ratings cliff state", () => {
  const reduce = ratingsCliffReducer(2);

  it("takes one pick per round and moves on only after a pick", () => {
    let s = initialRatingsCliffState();
    s = reduce(s, { type: "next" });
    expect(s.advanced).toBe(0);
    s = reduce(s, { type: "answered", round: 0, answer: answer("a", "a") });
    // A second pick for the same round is ignored.
    s = reduce(s, { type: "answered", round: 0, answer: answer("b", "a") });
    expect(s.answers).toHaveLength(1);
    s = reduce(s, { type: "next" });
    s = reduce(s, { type: "answered", round: 1, answer: answer("c", "d") });
    expect(isFinished(s, 2)).toBe(false);
    s = reduce(s, { type: "next" });
    expect(isFinished(s, 2)).toBe(true);
    expect(correctCount(s)).toBe(1);
    expect(reduce(s, { type: "answered", round: 2, answer: answer("x", "x") })).toBe(s);
  });

  it("shares marks only", () => {
    const s = { answers: [answer("a", "a"), answer("b", "c")], advanced: 2 };
    expect(ratingsCliffShareText("Ratings Cliff #6", s, 2)).toBe("Ratings Cliff #6 1/2\n🟩🟥");
  });
});
