import { describe, expect, it } from "vitest";

import { checkGrid, checkGuess, solution, toPublicPuzzle } from "./grid";
import { SAMPLE_FILMS, sampleTiles } from "./sample-puzzle";
import type { Puzzle } from "./types";

const JAWS = 578;
const RAIDERS = 85;

let nextId = 0;
const puzzle: Puzzle = {
  id: "11111111-1111-1111-1111-111111111111",
  date: "2026-10-14",
  films: SAMPLE_FILMS,
  tiles: sampleTiles(() => `tile${++nextId}`),
  warmup: [],
};
const tilesOf = (filmId: number) => puzzle.tiles.filter((t) => t.filmId === filmId).map((t) => t.id);

describe("checkGuess", () => {
  it("accepts all four tiles of one film and returns the group", () => {
    const result = checkGuess(puzzle, tilesOf(JAWS));
    expect(result).toEqual({
      kind: "correct",
      group: { filmId: JAWS, title: "Jaws", year: 1975, posterUrl: null, tier: 1, tileIds: tilesOf(JAWS) },
    });
  });

  it("is order-independent", () => {
    expect(checkGuess(puzzle, [...tilesOf(RAIDERS)].reverse()).kind).toBe("correct");
  });

  it("reports one away when three of four tiles match", () => {
    const guess = [...tilesOf(JAWS).slice(0, 3), tilesOf(RAIDERS)[0]];
    expect(checkGuess(puzzle, guess)).toEqual({ kind: "one_away" });
  });

  it("reports wrong for a two-two split", () => {
    const guess = [...tilesOf(JAWS).slice(0, 2), ...tilesOf(RAIDERS).slice(0, 2)];
    expect(checkGuess(puzzle, guess)).toEqual({ kind: "wrong" });
  });

  it("rejects malformed guesses", () => {
    const jaws = tilesOf(JAWS);
    expect(checkGuess(puzzle, jaws.slice(0, 3)).kind).toBe("invalid");
    expect(checkGuess(puzzle, [jaws[0], jaws[0], jaws[1], jaws[2]]).kind).toBe("invalid");
    expect(checkGuess(puzzle, [...jaws.slice(0, 3), "nope"]).kind).toBe("invalid");
  });
});

describe("toPublicPuzzle", () => {
  const base = "/api/puzzles/2026-10-14";

  it("leaks no film, label or grouping information", () => {
    const json = JSON.stringify(toPublicPuzzle(puzzle, base, "2026-10-14"));
    for (const film of puzzle.films) expect(json).not.toContain(film.title);
    for (const tile of puzzle.tiles) expect(json).not.toContain(tile.label);
    expect(json).not.toMatch(/film|tmdb|glyph|tier/i);
  });

  it("numbers tiles by their starting position and serves images from the API base", () => {
    const tiles = toPublicPuzzle(puzzle, base, "2026-10-14").tiles;
    expect(tiles.map((t) => t.number)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(tiles.map((t) => t.id)).toEqual(puzzle.tiles.map((t) => t.id));
    expect(tiles[0].imageUrl).toBe(`${base}/tiles/${puzzle.tiles[0].id}/image`);
  });
});

describe("solution", () => {
  it("lists every group easiest first", () => {
    expect(solution(puzzle).map((g) => g.tier)).toEqual([1, 2, 3, 4]);
    expect(
      solution(puzzle)
        .flatMap((g) => g.tileIds)
        .sort(),
    ).toEqual(puzzle.tiles.map((t) => t.id).sort());
  });
});

describe("checkGrid", () => {
  it("passes the sample puzzle", () => {
    expect(checkGrid(puzzle)).toEqual({ errors: [], warnings: [] });
  });

  it("flags a film with the wrong number of tiles", () => {
    const broken: Puzzle = {
      ...puzzle,
      tiles: puzzle.tiles.map((t) => (t.id === tilesOf(JAWS)[0] ? { ...t, filmId: RAIDERS } : t)),
    };
    expect(checkGrid(broken).errors).toEqual(["Jaws has 3 of 4 tiles.", "Raiders of the Lost Ark has 5 of 4 tiles."]);
  });

  it("flags missing films and shared tiers", () => {
    const partial: Puzzle = { ...puzzle, films: [SAMPLE_FILMS[0], { ...SAMPLE_FILMS[1], tier: 1 }], tiles: [] };
    expect(checkGrid(partial).errors).toEqual(
      expect.arrayContaining(["Pick 4 films (2 so far).", "Each film needs its own difficulty tier."]),
    );
  });

  it("blocks the same picture twice and warns about two crops of one picture", () => {
    const backdrop = (x: number) =>
      ({ kind: "tmdb", source: "backdrop", path: "/a.jpg", crop: { x, y: 0, width: 0.5, height: 1 } }) as const;
    const [a, b] = puzzle.tiles;
    const same: Puzzle = {
      ...puzzle,
      tiles: puzzle.tiles.map((t) => (t === a || t === b ? { ...t, image: backdrop(0) } : t)),
    };
    expect(checkGrid(same).errors).toContain("The same picture is used for more than one tile.");

    const twoCrops: Puzzle = {
      ...puzzle,
      tiles: puzzle.tiles.map((t) =>
        t === a ? { ...t, image: backdrop(0) } : t === b ? { ...t, image: backdrop(0.5) } : t,
      ),
    };
    expect(checkGrid(twoCrops).errors).toEqual([]);
    expect(checkGrid(twoCrops).warnings).toHaveLength(1);
  });

  it("warns when every film has the same mix of tile types", () => {
    const types = ["headshot", "still", "empty_set", "prop"] as const;
    const uniform: Puzzle = {
      ...puzzle,
      tiles: puzzle.films.flatMap((film) =>
        tilesOf(film.tmdbId).map((id, i) => ({ ...puzzle.tiles.find((t) => t.id === id)!, type: types[i] })),
      ),
    };
    expect(checkGrid(uniform).warnings).toEqual([
      "Every film has the same mix of tile types, which lets players solve by elimination.",
    ]);
  });
});
