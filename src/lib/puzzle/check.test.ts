import { describe, expect, it } from "vitest";

import { checkBarcodes, checkPuzzle, checkWarmup } from "./check";
import { SAMPLE_FILMS, SAMPLE_WARMUP, SAMPLE_WARMUP_FILMS, sampleTiles } from "./sample-puzzle";
import type { Puzzle, WarmupEntry } from "./types";

let nextId = 0;
const warmup: WarmupEntry[] = SAMPLE_WARMUP.map((entry, i) => ({
  ...entry,
  id: `w${i}`,
  position: i + 1,
  answer: {
    title: SAMPLE_WARMUP_FILMS[i].title,
    originalTitle: null,
    year: SAMPLE_WARMUP_FILMS[i].year,
    posterPath: null,
  },
}));
const puzzle: Puzzle = {
  id: "11111111-1111-1111-1111-111111111111",
  date: null,
  films: SAMPLE_FILMS,
  tiles: sampleTiles(() => `t${++nextId}`),
  warmup,
};

describe("checkWarmup", () => {
  it("passes five warm-up films that are not in the grid", () => {
    expect(checkWarmup(puzzle).errors).toEqual([]);
  });

  it("needs exactly five titles", () => {
    expect(checkWarmup({ ...puzzle, warmup: warmup.slice(0, 3) }).errors).toEqual(["Add 5 warm-up titles (3 so far)."]);
  });

  it("refuses a film that is also in the grid", () => {
    const clash = { ...warmup[0], filmId: 578, answer: { ...warmup[0].answer, title: "Jaws" } };
    expect(checkWarmup({ ...puzzle, warmup: [clash, ...warmup.slice(1)] }).errors).toEqual([
      "Jaws is in both the warm-up and the grid.",
    ]);
  });
});

describe("checkPuzzle", () => {
  it("combines grid and warm-up problems", () => {
    const result = checkPuzzle({ ...puzzle, tiles: puzzle.tiles.slice(1), warmup: [] });
    expect(result.errors).toContain("Add 5 warm-up titles (0 so far).");
    expect(result.errors.some((e) => e.endsWith("of 4 tiles."))).toBe(true);
  });
});

describe("checkBarcodes", () => {
  it("passes films with a palette or an upload", () => {
    const films = puzzle.films.map((f, i) =>
      i === 0 ? { ...f, barcode: { ...f.barcode, colors: null, upload: true } } : f,
    );
    expect(checkBarcodes({ ...puzzle, films }).errors).toEqual([]);
  });

  it("asks for a barcode when the palette is missing or too short", () => {
    const films = puzzle.films.map((f, i) =>
      i === 1 ? { ...f, barcode: { ...f.barcode, colors: ["#000000", "#ffffff"], upload: false } } : f,
    );
    expect(checkBarcodes({ ...puzzle, films }).errors).toEqual([
      "Back to the Future needs a barcode: regenerate it or upload one.",
    ]);
  });
});
