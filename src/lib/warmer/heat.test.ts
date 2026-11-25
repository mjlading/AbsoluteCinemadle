import { describe, expect, it } from "vitest";

import { heatOf, warmerShareText } from "./heat";
import type { RankedFilm } from "./types";

const entry = (rank: number, hint = false): RankedFilm => ({
  film: { id: rank, title: `Film ${rank}`, year: 2000, posterUrl: null, overview: "" },
  rank,
  hint,
});

describe("Warmer heat", () => {
  it("steps from cold to the film itself at the rank boundaries", () => {
    expect([2982, 1001, 1000, 301, 300, 51, 50, 11, 10, 2, 1].map((r) => heatOf(r).key)).toEqual([
      "cold",
      "cold",
      "cool",
      "cool",
      "warm",
      "warm",
      "hot",
      "hot",
      "burning",
      "burning",
      "film",
    ]);
  });

  it("shares one square per guess, hints counted but not drawn", () => {
    const played = [entry(1500), entry(300, true), entry(40), entry(1)];
    expect(warmerShareText("2026-11-25", played, true)).toBe("Warmer #16: 3 guesses, 1 hint\n🟦🟧🎬");
    expect(warmerShareText("2026-11-25", [entry(700)], false)).toBe("Warmer #16: gave up after 1 guess\n⬜");
  });
});
