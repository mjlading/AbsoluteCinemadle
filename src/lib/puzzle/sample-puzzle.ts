import "server-only";

import { seededRandom, shuffled } from "@/lib/random";
import type { Puzzle, PuzzleFilm, PuzzleTile } from "./types";

/**
 * Hardcoded phase 1 puzzle with emoji placeholder art, served for every date
 * until puzzles come from the database.
 * Harrison Ford appears in two groups on purpose, as a red herring.
 */
const FILMS: PuzzleFilm[] = [
  { id: "jaws", tmdbId: 578, title: "Jaws", year: 1975, tier: 1 },
  { id: "back-to-the-future", tmdbId: 105, title: "Back to the Future", year: 1985, tier: 2 },
  { id: "raiders", tmdbId: 85, title: "Raiders of the Lost Ark", year: 1981, tier: 3 },
  { id: "blade-runner", tmdbId: 78, title: "Blade Runner", year: 1982, tier: 4 },
];

type TileSeed = [id: string, filmId: string, type: PuzzleTile["type"], label: string, glyph: string, hue: number];

const TILES: TileSeed[] = [
  ["q7m2xk", "jaws", "still", "Still: the fin", "🦈", 200],
  ["b4t9wn", "jaws", "still", "Still: the Orca at sea", "🛥️", 190],
  ["z8c1rp", "jaws", "prop", "Prop: yellow barrels", "🛢️", 45],
  ["h3v6ty", "jaws", "headshot", "Roy Scheider", "👮", 25],
  ["m9d2ke", "back-to-the-future", "headshot", "Christopher Lloyd", "🧑‍🔬", 280],
  ["x5p8la", "back-to-the-future", "headshot", "Michael J. Fox", "😎", 15],
  ["r2w7gd", "back-to-the-future", "prop", "Prop: red electric guitar", "🎸", 350],
  ["c6n4us", "back-to-the-future", "empty_set", "Location: clock tower square", "🕰️", 230],
  ["t1k5ob", "raiders", "headshot", "Harrison Ford", "🤠", 35],
  ["j8f3qe", "raiders", "headshot", "Karen Allen", "👩", 330],
  ["v4y9hm", "raiders", "prop", "Prop: golden idol", "🗿", 50],
  ["e7s2zc", "raiders", "still", "Still: the Well of Souls", "🐍", 110],
  ["n5g8di", "blade-runner", "headshot", "Harrison Ford", "🕵️", 260],
  ["w3a6fu", "blade-runner", "prop", "Prop: origami unicorn", "🦄", 300],
  ["k9r1vj", "blade-runner", "empty_set", "Location: rain-soaked city", "🌃", 240],
  ["p6e4yl", "blade-runner", "still", "Still: tears in rain", "🌧️", 210],
];

export function samplePuzzle(date: string): Puzzle {
  const tiles: PuzzleTile[] = TILES.map(([id, filmId, type, label, glyph, hue]) => ({
    id,
    filmId,
    type,
    label,
    image: { kind: "placeholder", glyph, hue },
  }));
  return { date, films: FILMS, tiles: shuffled(tiles, seededRandom(date)) };
}
