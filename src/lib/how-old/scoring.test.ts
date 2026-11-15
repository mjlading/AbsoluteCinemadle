import { describe, expect, it } from "vitest";

import { POINTS } from "@/config/scoring";
import { ageOn, closenessMark, pointsFor, shareText } from "./scoring";

describe("ageOn", () => {
  it("counts whole years, turning over on the birthday", () => {
    expect(ageOn("1956-07-09", "1994-06-23")).toBe(37);
    expect(ageOn("1956-07-09", "1994-07-09")).toBe(38);
    expect(ageOn("1956-07-09", "1994-07-08")).toBe(37);
    expect(ageOn("1980-02-29", "1990-02-28")).toBe(9);
  });
});

describe("pointsFor", () => {
  it("gives the full score for the exact age, less per year off either way, never below 0", () => {
    const { exact, perYearOff } = POINTS.howOld;
    expect(pointsFor(37, 37)).toBe(exact);
    expect(pointsFor(40, 37)).toBe(exact + 3 * perYearOff);
    expect(pointsFor(34, 37)).toBe(exact + 3 * perYearOff);
    expect(pointsFor(90, 10)).toBe(0);
  });
});

describe("shareText", () => {
  it("shows the score and how close each round was, never a name or an age", () => {
    const rounds = [
      { guess: 37, age: 37, points: pointsFor(37, 37) },
      { guess: 60, age: 59, points: pointsFor(60, 59) },
      { guess: 20, age: 16, points: pointsFor(20, 16) },
      { guess: 30, age: 50, points: pointsFor(30, 50) },
    ];
    const text = shareText("2026-11-15", rounds, "https://example.test/how-old");
    expect(text).toContain(
      closenessMark(37, 37) + closenessMark(60, 59) + closenessMark(20, 16) + closenessMark(30, 50),
    );
    expect(text).not.toMatch(/\b(37|59|16|50)\b/);
    expect(
      new Set([closenessMark(37, 37), closenessMark(60, 59), closenessMark(20, 16), closenessMark(30, 50)]).size,
    ).toBe(4);
  });
});
