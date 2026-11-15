import { describe, expect, it } from "vitest";

import { POINTS } from "@/config/scoring";
import {
  doubleFeatureReducer,
  doubleFeatureShareText,
  initialDoubleFeatureState,
  isFinished,
  scoreOf,
  type AnsweredRound,
} from "./state";

const answer = (picked: string, correctOption = "a"): AnsweredRound => ({
  picked,
  correctOption,
  values: { a: "2h", b: "1h 30m" },
  years: { a: 1999, b: 2004 },
});

describe("double feature state", () => {
  const reduce = doubleFeatureReducer(3);

  it("plays every round, scoring each right pick, then shows the results", () => {
    let s = initialDoubleFeatureState();
    s = reduce(s, { type: "next" }); // nothing to move on from yet
    expect(s.current).toBe(0);
    s = reduce(s, { type: "answer", round: 0, answer: answer("a") });
    s = reduce(s, { type: "answer", round: 0, answer: answer("b") }); // a round is answered once
    expect(s.answers).toHaveLength(1);
    s = reduce(s, { type: "next" });
    s = reduce(s, { type: "answer", round: 1, answer: answer("b") });
    s = reduce(s, { type: "next" });
    s = reduce(s, { type: "answer", round: 2, answer: answer("b", "b") });
    expect(isFinished(s, 3)).toBe(false);
    s = reduce(s, { type: "next" });
    expect(isFinished(s, 3)).toBe(true);
    expect(scoreOf(s)).toBe(2 * POINTS.doubleFeature.perCorrect);
    expect(doubleFeatureShareText(s, 3, "2026-11-15")).toBe("Double Feature 2026-11-15\n🟩🟥🟩 2/3");
  });
});
