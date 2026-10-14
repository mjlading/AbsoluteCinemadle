import { describe, expect, it } from "vitest";

import { maxScore, scoreDay } from "./score";
import { puzzleNumber, shareText } from "./share";
import { computeStreaks } from "./streaks";

const perfectGrid = { groupsFound: 4, mistakes: 0, flips: 0, soundHints: 0, reviewHints: 0 };

describe("scoreDay", () => {
  it("adds the rounds up from the scoring config", () => {
    expect(scoreDay({ warmup: { found: 3, total: 5 }, grid: perfectGrid, bonus: { correct: 2, total: 4 } })).toEqual({
      warmup: 30,
      grid: 100,
      bonus: 20,
      total: 150,
    });
  });

  it("charges for mistakes, flips and hints", () => {
    const grid = { groupsFound: 4, mistakes: 2, flips: 3, soundHints: 1, reviewHints: 1 };
    expect(scoreDay({ warmup: null, grid, bonus: null }).grid).toBe(100 - 20 - 15 - 15 - 10);
  });

  it("shares the base out per film on a lost grid, never below zero", () => {
    expect(scoreDay({ warmup: null, grid: { ...perfectGrid, groupsFound: 2, mistakes: 4 }, bonus: null }).grid).toBe(
      10,
    );
    expect(scoreDay({ warmup: null, grid: { ...perfectGrid, groupsFound: 0, mistakes: 4 }, bonus: null }).grid).toBe(0);
  });

  it("knows the best possible score", () => {
    expect(maxScore(5)).toBe(190);
  });
});

describe("computeStreaks", () => {
  it("counts the current run up to today, or yesterday until midnight", () => {
    const days = ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-14"];
    expect(computeStreaks(days, "2026-10-14")).toEqual({ current: 1, best: 3 });
    expect(computeStreaks(days, "2026-10-15")).toEqual({ current: 1, best: 3 });
    expect(computeStreaks(days, "2026-10-16")).toEqual({ current: 0, best: 3 });
    expect(computeStreaks(["2026-10-12", "2026-10-13"], "2026-10-14")).toEqual({ current: 2, best: 2 });
    expect(computeStreaks([], "2026-10-14")).toEqual({ current: 0, best: 0 });
  });

  it("crosses month ends", () => {
    expect(computeStreaks(["2026-10-31", "2026-11-01"], "2026-11-01").current).toBe(2);
  });
});

describe("shareText", () => {
  it("summarises the day without naming a film", () => {
    expect(
      shareText({
        date: "2026-10-16",
        total: 135,
        warmup: [true, false, true, true, false],
        gridGuesses: [
          [1, 1, 1, 1],
          [2, 3, 2, 2],
          [2, 2, 2, 2],
          [3, 3, 3, 3],
          [4, 4, 4, 4],
        ],
        bonus: [true, true, false, true],
        hints: { flips: 1, sound: 1, review: 0 },
      }),
    ).toBe(
      [
        "Absolute Cinemadle #3: 135 points",
        "Warm-up 🟩⬛🟩🟩⬛",
        "🟦🟦🟦🟦",
        "🟨🟪🟨🟨",
        "🟨🟨🟨🟨",
        "🟪🟪🟪🟪",
        "⬜⬜⬜⬜",
        "Bonus 🟩🟩🟥🟩",
        "Hints 🔊🏷️",
        "absolutecinemadle.fun",
      ].join("\n"),
    );
  });

  it("numbers puzzles from the launch day", () => {
    expect(puzzleNumber("2026-10-14")).toBe(1);
    expect(puzzleNumber("2026-11-14")).toBe(32);
  });
});
