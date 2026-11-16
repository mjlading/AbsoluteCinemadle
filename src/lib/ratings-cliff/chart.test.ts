import { describe, expect, it } from "vitest";

import {
  chartClue,
  chartDescription,
  ratingBand,
  revealLine,
  seasonColumn,
  shapeScore,
  toPublicSeasons,
  type ChartSeason,
} from "./chart";
import { optionId, pickAnswers, pickDecoys, weightedShuffle } from "./pick";
import { seededRandom } from "@/lib/random";

const season = (number: number, ratings: number[]): ChartSeason => ({
  number,
  episodes: ratings.map((rating, i) => ({ episode: i + 1, rating, votes: 100 })),
});

const collapse = [season(1, [8.2, 8.5, 9.0]), season(2, [8.4, 9.3, 8.8]), season(3, [6.9, 5.6, 4.5])];
const flat = [season(1, [8.0, 8.1, 8.0]), season(2, [8.1, 8.0, 8.1])];

describe("chart grid", () => {
  it("sorts ratings into bands, best first", () => {
    const floors = [9, 8.5, 8, 7, 6];
    expect([9.4, 9, 8.9, 8.5, 8, 7.9, 7, 6, 5.9, 2].map((r) => ratingBand(r, floors))).toEqual([
      0, 0, 1, 1, 2, 3, 3, 4, 5, 5,
    ]);
  });

  it("puts each episode on the row of its number, leaving a gap for one left out", () => {
    expect(seasonColumn({ number: 1, episodes: [1, 2, 4], ratings: [8, 8.1, 8.3] })).toEqual([8, 8.1, null, 8.3]);
  });

  it("lists a season in airing order when its episodes aren't numbered from 1", () => {
    expect(seasonColumn({ number: 2, episodes: [14, 15, 16], ratings: [7, 7.5, 8] })).toEqual([7, 7.5, 8]);
  });
});

describe("chart text", () => {
  it("describes the chart without naming anything", () => {
    const pub = toPublicSeasons(collapse);
    expect(chartClue(pub)).toBe("3 seasons, 9 rated episodes");
    expect(chartDescription(pub)).toBe(
      "Episode ratings chart: 3 seasons, 9 episodes; ratings from 4.5 to 9.3. Season averages: S1 8.6, S2 8.8, S3 5.7.",
    );
  });

  it("builds the reveal from the best and worst episodes and a final-season collapse", () => {
    expect(revealLine(collapse)).toBe(
      "Its best-rated episode is S2 E2 at 9.3; its worst is S3 E3 at 4.5. Its final season averaged 5.7, against 8.8 for season 2.",
    );
    expect(revealLine(flat)).toBe("Its best-rated episode is S1 E2 at 8.1; its worst is S1 E1 at 8.0.");
  });

  it("scores a collapse far above a flat line", () => {
    expect(shapeScore(toPublicSeasons(collapse))).toBeGreaterThan(8);
    expect(shapeScore(toPublicSeasons(flat))).toBeLessThan(0.5);
  });
});

describe("picking", () => {
  const rules = { minShape: 3, maxSameGenre: 1 };

  it("never picks a flat chart, keeps genres apart and is the same for a seed", () => {
    const candidates = [
      { seriesId: 1, genre: 18, shape: 9, voteCount: 20000 },
      { seriesId: 2, genre: 18, shape: 5, voteCount: 5000 },
      { seriesId: 3, genre: 35, shape: 2, voteCount: 20000 },
      { seriesId: 4, genre: 35, shape: 4, voteCount: 3000 },
    ];
    const a = pickAnswers(candidates, 3, rules, seededRandom("x"));
    expect(a.map((c) => c.genre).sort()).toEqual([18, 35]);
    expect(a.some((c) => c.seriesId === 3)).toBe(false);
    expect(pickAnswers(candidates, 3, rules, seededRandom("x"))).toEqual(a);
  });

  it("picks wrong options with a near season count, skipping excluded series and twin titles", () => {
    const pool = [
      { seriesId: 1, title: "Answer", seasons: 8 },
      { seriesId: 2, title: "Near", seasons: 7 },
      { seriesId: 3, title: "Far", seasons: 1 },
      { seriesId: 4, title: "Also near", seasons: 9 },
      { seriesId: 5, title: "Near", seasons: 8 },
      { seriesId: 6, title: "Close", seasons: 8 },
    ];
    const decoys = pickDecoys(8, pool, new Set([1]), 3, seededRandom("y"));
    expect(decoys.map((d) => d.seriesId)).not.toContain(1);
    expect(decoys.map((d) => d.seriesId)).not.toContain(3);
    expect(new Set(decoys.map((d) => d.title)).size).toBe(3);
  });

  it("orders a weighted shuffle by weight on average and makes opaque ids", () => {
    const random = seededRandom("z");
    let heavyFirst = 0;
    for (let i = 0; i < 200; i++) {
      if (weightedShuffle(["light", "heavy"], (x) => (x === "heavy" ? 9 : 1), random)[0] === "heavy") heavyFirst++;
    }
    expect(heavyFirst).toBeGreaterThan(150);
    expect(optionId(random)).toMatch(/^[0-9a-z]{6}$/);
  });
});
