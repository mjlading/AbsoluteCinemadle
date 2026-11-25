import { describe, expect, it } from "vitest";

import { nameKey, tidyName } from "./names";
import { replayCastingCall, replayCloseUps, replayRatingsCliff } from "./replay";

describe("leaderboard", () => {
  it("tidies names, refuses odd ones, and folds case and accents into one player", () => {
    expect(tidyName("  Mats   L ")).toBe("Mats L");
    expect(tidyName("<b>hi</b>")).toBeNull();
    expect(nameKey("Zoë O'Neil")).toBe(nameKey("zoe oneil"));
  });

  it("scores each game from its moves with the server's own checks, and refuses unfinished games", () => {
    const isRight = (text: string) => text === "Heat";
    expect(replayCloseUps([null, { text: "Heat" }], isRight)).toMatchObject({ won: true, summary: "Clue 2/4" });
    expect(replayCloseUps([{ text: "Ronin" }], isRight)).toBeNull();

    expect(
      replayCastingCall(
        [
          ["0", "1", "2"],
          ["3", "4", "5"],
          ["6", "7"],
        ],
        false,
        8,
      ),
    ).toEqual({
      score: 11,
      won: true,
      summary: "8/8 in 3",
    });
    expect(replayCastingCall([["0"]], false, 8)).toBeNull();

    expect(replayRatingsCliff(["a", "b", "x"], ["a", "b", "c"])).toMatchObject({ score: 2, summary: "2/3" });
    expect(replayRatingsCliff(["a"], ["a", "b"])).toBeNull();
  });
});
