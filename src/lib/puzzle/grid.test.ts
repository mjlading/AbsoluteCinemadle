import { describe, expect, it } from "vitest";

import { checkGuess, gridProblems, solution, toPublicPuzzle } from "./grid";
import { samplePuzzle } from "./sample-puzzle";
import type { Puzzle } from "./types";

const puzzle = samplePuzzle("2026-10-14");
const tilesOf = (filmId: string) => puzzle.tiles.filter((t) => t.filmId === filmId).map((t) => t.id);

describe("checkGuess", () => {
  it("accepts all four tiles of one film and returns the group", () => {
    const result = checkGuess(puzzle, tilesOf("jaws"));
    expect(result).toEqual({
      kind: "correct",
      group: { filmId: "jaws", title: "Jaws", year: 1975, tier: 1, tileIds: tilesOf("jaws") },
    });
  });

  it("is order-independent", () => {
    expect(checkGuess(puzzle, [...tilesOf("raiders")].reverse()).kind).toBe("correct");
  });

  it("reports one away when three of four tiles match", () => {
    const guess = [...tilesOf("jaws").slice(0, 3), tilesOf("raiders")[0]];
    expect(checkGuess(puzzle, guess)).toEqual({ kind: "one_away" });
  });

  it("reports wrong for a two-two split", () => {
    const guess = [...tilesOf("jaws").slice(0, 2), ...tilesOf("raiders").slice(0, 2)];
    expect(checkGuess(puzzle, guess)).toEqual({ kind: "wrong" });
  });

  it("rejects malformed guesses", () => {
    const jaws = tilesOf("jaws");
    expect(checkGuess(puzzle, jaws.slice(0, 3)).kind).toBe("invalid");
    expect(checkGuess(puzzle, [jaws[0], jaws[0], jaws[1], jaws[2]]).kind).toBe("invalid");
    expect(checkGuess(puzzle, [...jaws.slice(0, 3), "nope"]).kind).toBe("invalid");
  });
});

describe("toPublicPuzzle", () => {
  it("leaks no film, label or grouping information", () => {
    const json = JSON.stringify(toPublicPuzzle(puzzle));
    for (const film of puzzle.films) {
      expect(json).not.toContain(film.title);
      expect(json).not.toContain(film.id);
    }
    for (const tile of puzzle.tiles) expect(json).not.toContain(tile.label);
    expect(json).not.toContain("tmdb");
  });

  it("numbers tiles by their starting position", () => {
    const tiles = toPublicPuzzle(puzzle).tiles;
    expect(tiles.map((t) => t.number)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(tiles.map((t) => t.id)).toEqual(puzzle.tiles.map((t) => t.id));
  });
});

describe("solution", () => {
  it("lists every group easiest first", () => {
    expect(solution(puzzle).map((g) => g.tier)).toEqual([1, 2, 3, 4]);
    expect(solution(puzzle).flatMap((g) => g.tileIds).sort()).toEqual(puzzle.tiles.map((t) => t.id).sort());
  });
});

describe("gridProblems", () => {
  it("passes the sample puzzle", () => {
    expect(gridProblems(puzzle)).toEqual([]);
  });

  it("flags a film with the wrong number of tiles", () => {
    const broken: Puzzle = {
      ...puzzle,
      tiles: puzzle.tiles.map((t) => (t.id === tilesOf("jaws")[0] ? { ...t, filmId: "raiders" } : t)),
    };
    expect(gridProblems(broken)).toEqual([
      "Jaws has 3 tiles instead of 4.",
      "Raiders of the Lost Ark has 5 tiles instead of 4.",
    ]);
  });
});

describe("samplePuzzle", () => {
  it("orders tiles the same way for everyone on a given day", () => {
    const ids = (date: string) => samplePuzzle(date).tiles.map((t) => t.id);
    expect(ids("2026-10-14")).toEqual(ids("2026-10-14"));
    expect(ids("2026-10-14")).not.toEqual(ids("2026-10-15"));
  });
});
