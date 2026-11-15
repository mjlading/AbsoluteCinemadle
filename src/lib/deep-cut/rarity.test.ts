import { describe, expect, it } from "vitest";

import { POINTS } from "@/config/scoring";
import { fame, fameForScore, percentRarerThan, rarityScore } from "./rarity";

const MAX = POINTS.deepCut.max;
// "A film with Tom Hanks", as TMDB counted votes in November 2026.
const TOP = 30_891; // Forrest Gump

describe("rarityScore", () => {
  it("gives the most obvious answer 0 and anything better known 0 too", () => {
    expect(rarityScore(TOP, TOP)).toBe(0);
    expect(rarityScore(TOP * 2, TOP)).toBe(0);
  });

  it("gives the second most famous answer a little, not half", () => {
    expect(rarityScore(20_834, TOP)).toBeLessThan(15); // Toy Story
  });

  it("puts a solid second-tier answer in the middle and a real deep cut near the top", () => {
    const big = rarityScore(4_254, TOP); // Big
    expect(big).toBeGreaterThan(30);
    expect(big).toBeLessThan(55);
    expect(rarityScore(191, TOP)).toBeGreaterThan(80); // Volunteers
  });

  it("stops paying more below the vote floor", () => {
    expect(rarityScore(50, TOP)).toBe(MAX);
    expect(rarityScore(3, TOP)).toBe(MAX);
    expect(rarityScore(0, TOP)).toBe(MAX);
  });

  it("rises as fame falls", () => {
    const scores = [TOP, 10_000, 3_000, 1_000, 300, 100].map((v) => rarityScore(v, TOP));
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
    expect(new Set(scores).size).toBe(scores.length);
  });

  it("copes with a set whose best-known film is under the floor", () => {
    expect(rarityScore(40, 40)).toBe(0);
    expect(rarityScore(10, 40)).toBe(MAX);
  });

  it("reads fame from the film's vote count", () => {
    expect(fame({ voteCount: 1234 })).toBe(1234);
  });
});

describe("fameForScore", () => {
  it("is the inverse of rarityScore", () => {
    for (const score of [10, 40, 60, 90]) {
      const votes = fameForScore(score, TOP);
      expect(rarityScore(votes, TOP)).toBeGreaterThanOrEqual(score);
      expect(rarityScore(votes + Math.ceil(votes * 0.02), TOP)).toBeLessThanOrEqual(score);
    }
    expect(fameForScore(0, TOP)).toBe(TOP);
    expect(fameForScore(MAX, TOP)).toBe(50);
  });
});

describe("percentRarerThan", () => {
  const scale = { top: 1000, fames: [1000, 800, 400, 200, 100], total: 5 };

  it("counts the fitting films that are better known", () => {
    expect(percentRarerThan(1000, scale)).toBe(0);
    expect(percentRarerThan(400, scale)).toBe(40);
    expect(percentRarerThan(150, scale)).toBe(80);
    expect(percentRarerThan(60, scale)).toBe(100);
  });

  it("puts a film under the floor below every film that fits", () => {
    expect(percentRarerThan(10, scale)).toBe(100);
  });

  it("spreads the films past the depth read on a log scale down to the floor", () => {
    // 2 films read, 100 in all: 98 more between 500 votes and the floor of 50.
    const partial = { top: 5000, fames: [5000, 500], total: 100 };
    expect(percentRarerThan(5000, partial)).toBe(0);
    expect(percentRarerThan(158, partial)).toBe(51); // halfway down the log scale from 500 to 50
    expect(percentRarerThan(50, partial)).toBe(100);
    expect(percentRarerThan(20, partial)).toBe(100);
  });

  it("is 0 for an empty set", () => {
    expect(percentRarerThan(100, { top: 0, fames: [], total: 0 })).toBe(0);
  });
});
