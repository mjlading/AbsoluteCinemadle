import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import {
  deepCutReducer,
  deepCutShareText,
  initialDeepCutState,
  isOver,
  needsReveal,
  placing,
  totalScore,
  triesLeft,
  type DeepCutAction,
} from "./state";

const reveal = {
  mostObvious: { tmdbId: 1, title: "Obvious", year: 2000, score: 0 },
  deepCut: { tmdbId: 2, title: "Hidden Gem", year: 1980, score: 85 },
};
const miss = (prompt: number, tmdbId: number): DeepCutAction => ({
  type: "miss",
  prompt,
  film: { tmdbId, title: `Film ${tmdbId}`, year: null },
  why: "no",
});
const fit = (prompt: number, score: number): DeepCutAction => ({
  type: "settle",
  prompt,
  outcome: { kind: "fit", film: { tmdbId: 9, title: "Mine", year: 1999 }, score, percentile: 50, ...reveal },
});
const play = (...actions: DeepCutAction[]) => actions.reduce(deepCutReducer, initialDeepCutState(3));

describe("deep cut state", () => {
  it("uses a try per film that doesn't fit, once per film", () => {
    const s = play(miss(0, 5), miss(0, 5));
    expect(s.prompts[0].misses).toHaveLength(1);
    expect(triesLeft(s.prompts[0])).toBe(RULES.deepCut.triesPerPrompt - 1);
  });

  it("ends a prompt with no points once the tries run out, not before", () => {
    const out: DeepCutAction = { type: "settle", prompt: 0, outcome: { kind: "out", ...reveal } };
    expect(play(miss(0, 5), out).prompts[0].outcome).toBeNull();
    const misses = Array.from({ length: RULES.deepCut.triesPerPrompt }, (_, i) => miss(0, i + 10));
    const s = play(...misses);
    expect(needsReveal(s.prompts[0])).toBe(true);
    expect(play(...misses, miss(0, 99)).prompts[0].misses).toHaveLength(RULES.deepCut.triesPerPrompt);
    expect(play(...misses, out).prompts[0].outcome?.kind).toBe("out");
  });

  it("keeps the first fitting answer and moves on only once a prompt is settled", () => {
    expect(play({ type: "next" }).current).toBe(0);
    const s = play(fit(0, 40), fit(0, 90), { type: "next" });
    expect(s.prompts[0].outcome).toMatchObject({ score: 40 });
    expect(s.current).toBe(1);
  });

  it("adds up the scores and shares them without film titles", () => {
    const s = play(fit(0, 40), { type: "next" }, fit(1, 75), { type: "next" }, miss(2, 3));
    expect(isOver(s)).toBe(false);
    const done = [miss(2, 4), miss(2, 5)].reduce(deepCutReducer, s);
    const over = deepCutReducer(
      deepCutReducer(done, { type: "settle", prompt: 2, outcome: { kind: "out", ...reveal } }),
      { type: "next" },
    );
    expect(isOver(over)).toBe(true);
    expect(totalScore(over)).toBe(115);
    const text = deepCutShareText(
      "2026-11-15",
      ["A heist film", "A western from the 1960s", "A film with Tom Hanks"],
      over,
      "https://x/deep-cut",
    );
    expect(text).toContain("A heist film: 40");
    expect(text).toContain("115/300");
    expect(text).not.toMatch(/Mine|Obvious|Hidden|Film \d/);
  });

  it("places an answer in a plain sentence", () => {
    expect(placing(0, 0)).toBe("The most obvious answer there is.");
    expect(placing(9, 0)).toBe("One of the best-known films that fit.");
    expect(placing(70, 83)).toBe("Rarer than 83% of the films that fit.");
    expect(placing(100, 100)).toBe("Rarer than nearly every film that fits.");
  });
});
