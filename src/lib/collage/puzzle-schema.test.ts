import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CollageExportSchema, CollagePuzzleSchema, readCollagePuzzle } from "./puzzle-schema";

const fixture = JSON.parse(readFileSync("e2e/fixtures/keyword-collage.json", "utf8"));
const puzzle = fixture.puzzles[0];

describe("collage puzzle schema", () => {
  it("accepts the E2E fixture", () => {
    expect(CollageExportSchema.parse(fixture).puzzles).toHaveLength(1);
  });

  it("needs exactly one free keyword", () => {
    const keywords = puzzle.keywords.map((k: { free: boolean }) => ({ ...k, free: true }));
    expect(CollagePuzzleSchema.safeParse({ ...puzzle, keywords }).success).toBe(false);
  });

  it("refuses a puzzle with fewer than 5 keywords", () => {
    expect(CollagePuzzleSchema.safeParse({ ...puzzle, keywords: puzzle.keywords.slice(0, 4) }).success).toBe(false);
  });

  it("refuses a TMDB path that is not a plain file name", () => {
    const tile = {
      id: "badtile1",
      image: {
        kind: "tmdb",
        source: "backdrop",
        path: "https://evil.example/x.jpg",
        crop: { x: 0, y: 0, width: 0.5, height: 0.9 },
      },
      frame: { width: 1920, height: 1080 },
    };
    const keywords = [{ ...puzzle.keywords[0], tiles: [tile] }, ...puzzle.keywords.slice(1)];
    expect(CollagePuzzleSchema.safeParse({ ...puzzle, keywords }).success).toBe(false);
  });

  it("refuses ids that are not opaque tokens", () => {
    expect(CollagePuzzleSchema.safeParse({ ...puzzle, id: "../admin" }).success).toBe(false);
  });
});

describe("readCollagePuzzle", () => {
  it("serves a 6-keyword puzzle as 5, dropping the 6th in reveal order with its tiles", () => {
    const sixth = {
      ...puzzle.keywords[4],
      id: "kwsixth",
      label: "Sixth",
      tier: "easy",
      free: false,
      tiles: [{ ...puzzle.keywords[4].tiles[0], id: "sixthtile01" }],
    };
    const read = readCollagePuzzle({ ...puzzle, keywords: [...puzzle.keywords, sixth] });
    expect(read.keywords.map((k) => k.id)).toEqual(["kwhands", "kwdoors", "kwfood", "kwmouths", "kwsigns"]);
    expect(JSON.stringify(read)).not.toContain("sixthtile01");
  });

  it("puts the free keyword first whatever the stored order", () => {
    const read = readCollagePuzzle({ ...puzzle, keywords: [...puzzle.keywords].reverse() });
    expect(read.keywords[0].free).toBe(true);
  });
});
