import { describe, expect, it } from "vitest";

import { POINTS } from "@/config/scoring";
import { nameKey, tidyName } from "./names";
import { replayCastingCall, replayCloseUps, replayRatingsCliff } from "./replay";

describe("leaderboard names", () => {
  it("tidies spacing and refuses empty, long or markup-like names", () => {
    expect(tidyName("  Mats   L ")).toBe("Mats L");
    expect(tidyName("Zoë O'Neil")).toBe("Zoë O'Neil");
    expect(tidyName("")).toBeNull();
    expect(tidyName("   ")).toBeNull();
    expect(tidyName("a".repeat(21))).toBeNull();
    expect(tidyName("<b>hi</b>")).toBeNull();
    expect(tidyName("https://x.y")).toBeNull();
    expect(tidyName("-dash")).toBeNull();
  });

  it("treats case, accents and spacing as the same player", () => {
    expect(nameKey("Zoë O'Neil")).toBe(nameKey("zoe oneil"));
    expect(nameKey("Mats")).not.toBe(nameKey("Matt"));
  });
});

describe("Close-Ups replay", () => {
  const isRight = (text: string, tmdbId?: number) => text === "Heat" || tmdbId === 949;
  const { start, perMissOrSkip, firstClueBonus } = POINTS.closeUps;

  it("scores a first-clue win with the bonus, and a later win less per miss or skip", () => {
    expect(replayCloseUps([{ text: "Heat" }], isRight)).toEqual({
      score: start + firstClueBonus,
      won: true,
      summary: "Clue 1/4",
    });
    expect(replayCloseUps([null, { text: "Ronin" }, { text: "Heet", tmdbId: 949 }], isRight)).toEqual({
      score: start + 2 * perMissOrSkip,
      won: true,
      summary: "Clue 3/4",
    });
  });

  it("judges guesses itself, so a client can't claim a wrong one was right", () => {
    expect(replayCloseUps([{ text: "Ronin" }, null, null, null], isRight)).toEqual({
      score: 0,
      won: false,
      summary: "Missed",
    });
  });

  it("refuses unfinished games and moves after the end", () => {
    expect(replayCloseUps([{ text: "Ronin" }], isRight)).toBeNull();
    expect(replayCloseUps([{ text: "Heat" }, null], isRight)).toBeNull();
  });
});

describe("Casting call replay", () => {
  it("gives a point per face and one per guess left on a win", () => {
    const films = [
      ["0", "1", "2"],
      ["3", "4", "5"],
      ["6", "7"],
    ];
    expect(replayCastingCall(films, false, 8)).toEqual({ score: 8 + 3, won: true, summary: "8/8 in 3" });
  });

  it("counts a face once however many films cross it out", () => {
    const films = [["0"], ["0", "1"], [], [], [], []];
    expect(replayCastingCall(films, false, 8)).toEqual({ score: 2, won: false, summary: "2/8" });
  });

  it("ends a game lost to the clock, and refuses one still going", () => {
    expect(replayCastingCall([["0"]], true, 8)).toEqual({ score: 1, won: false, summary: "1/8" });
    expect(replayCastingCall([["0"]], false, 8)).toBeNull();
  });
});

describe("Ratings Cliff replay", () => {
  it("counts picks that match each round's right option", () => {
    expect(replayRatingsCliff(["a", "b", "x"], ["a", "b", "c"])).toEqual({ score: 2, won: false, summary: "2/3" });
    expect(replayRatingsCliff(["a"], ["a"])?.won).toBe(true);
  });

  it("refuses a board that isn't finished", () => {
    expect(replayRatingsCliff(["a"], ["a", "b"])).toBeNull();
  });
});
