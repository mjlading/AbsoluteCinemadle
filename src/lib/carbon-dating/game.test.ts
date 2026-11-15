import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { seededRandom } from "@/lib/random";
import { carbonShareText, clampYear, distanceSquare, isValidGuess, roundPoints } from "./game";
import { pickBackdrop, pickDecades, type Backdrop } from "./pick";
import { carbonReducer, initialCarbonState } from "./state";

const { exact, perYearOff } = POINTS.carbonDating;

describe("roundPoints", () => {
  it("scores the exact year in full and drops per year off, either side", () => {
    expect(roundPoints(1977, 1977)).toBe(exact);
    expect(roundPoints(1979, 1977)).toBe(exact + 2 * perYearOff);
    expect(roundPoints(1975, 1977)).toBe(exact + 2 * perYearOff);
  });

  it("never goes below 0", () => {
    expect(roundPoints(1930, 2020)).toBe(0);
  });
});

describe("share text", () => {
  it("shows the total and a square per round, never a title or year", () => {
    const results = [
      { guess: 1977, year: 1977, title: "Star Wars", points: exact },
      { guess: 1990, year: 1987, title: "Lethal Weapon", points: roundPoints(1990, 1987) },
      { guess: 1950, year: 1946, title: "Gilda", points: roundPoints(1950, 1946) },
      { guess: 2000, year: 2023, title: "Wonka", points: 0 },
    ];
    const text = carbonShareText("2026-11-15", results);
    expect(text).toContain("🟩🟨🟨🟥");
    for (const r of results) {
      expect(text).not.toContain(r.title);
      expect(text).not.toContain(String(r.year));
    }
  });

  it("bands distances", () => {
    const { close, near, far } = RULES.carbonDating.shareBands;
    expect(distanceSquare(2000, 2000 + close)).toBe("🟩");
    expect(distanceSquare(2000, 2000 + near)).toBe("🟨");
    expect(distanceSquare(2000, 2000 - far)).toBe("🟧");
    expect(distanceSquare(2000, 2000 + far + 1)).toBe("🟥");
  });
});

describe("year range", () => {
  const now = new Date(2026, 5, 1);
  it("clamps to the slider's range", () => {
    expect(clampYear(1800, now)).toBe(RULES.carbonDating.minYear);
    expect(clampYear(2100, now)).toBe(2026);
    expect(clampYear(Number("abc"), now)).toBe(RULES.carbonDating.minYear);
  });
  it("rejects guesses outside it", () => {
    expect(isValidGuess(1999, now)).toBe(true);
    expect(isValidGuess(1999.5, now)).toBe(false);
    expect(isValidGuess(RULES.carbonDating.minYear - 1, now)).toBe(false);
  });
});

describe("pickDecades", () => {
  it("takes different decades, none after the board's year, in a seeded order", () => {
    const decades = RULES.carbonDating.decades;
    for (const seed of ["a", "b", "c", "d"]) {
      const picked = pickDecades(seededRandom(seed), decades, RULES.carbonDating.rounds, 2026);
      expect(picked).toHaveLength(RULES.carbonDating.rounds);
      expect(new Set(picked.map((d) => d.from)).size).toBe(picked.length);
      expect(pickDecades(seededRandom(seed), decades, RULES.carbonDating.rounds, 2026)).toEqual(picked);
    }
    expect(pickDecades(seededRandom("x"), decades, 9, 2015).every((d) => d.from <= 2015)).toBe(true);
  });
});

describe("pickBackdrop", () => {
  const backdrop = (file_path: string, width: number, height: number, vote_count: number): Backdrop => ({
    file_path,
    width,
    height,
    vote_count,
    vote_average: 5,
  });

  it("refuses a film with too few wide, big backdrops", () => {
    const few = [backdrop("/a", 1920, 1080, 3), backdrop("/b", 1920, 1080, 2), backdrop("/c", 1000, 562, 9)];
    expect(pickBackdrop(seededRandom("s"), few)).toBeNull();
  });

  it("picks among the best-voted few", () => {
    const many = [
      backdrop("/narrow", 1920, 1200, 50),
      ...["/1", "/2", "/3", "/4", "/5", "/6"].map((p, i) => backdrop(p, 1920, 1080, 10 - i)),
    ];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(pickBackdrop(seededRandom(`s${i}`), many)!.file_path);
    const best = ["/1", "/2", "/3", "/4", "/5", "/6"].slice(0, RULES.carbonDating.backdropChoices);
    expect([...seen].sort()).toEqual(best);
  });

  it("ranks 4K backdrops (mostly key art) after frame-sized ones", () => {
    const { keyArtWidth, backdropChoices } = RULES.carbonDating;
    const art = Array.from({ length: backdropChoices }, (_, i) =>
      backdrop(`/art${i}`, keyArtWidth, (keyArtWidth * 9) / 16, 99),
    );
    const frames = Array.from({ length: backdropChoices }, (_, i) => backdrop(`/frame${i}`, 1920, 1080, 1));
    for (let i = 0; i < 20; i++) {
      expect(pickBackdrop(seededRandom(`k${i}`), [...art, ...frames])!.file_path).toMatch(/^\/frame/);
    }
  });
});

describe("carbonReducer", () => {
  it("reveals a round once and moves on only after its reveal", () => {
    const reduce = carbonReducer(2);
    const result = { guess: 1980, year: 1982, title: "The Thing", points: roundPoints(1980, 1982) };
    let state = reduce(initialCarbonState(), { type: "next" });
    expect(state.position).toBe(0);
    state = reduce(state, { type: "revealed", result });
    state = reduce(state, { type: "revealed", result });
    expect(state.results).toHaveLength(1);
    state = reduce(state, { type: "next" });
    expect(state.position).toBe(1);
  });
});
