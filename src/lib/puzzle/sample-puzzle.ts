import type { PuzzleFilm, PuzzleTile, WarmupEntry } from "./types";

/**
 * A puzzle with emoji placeholder art, for development seeds and tests.
 * Harrison Ford appears in two groups on purpose, as a red herring.
 */
export const SAMPLE_FILMS: PuzzleFilm[] = [
  { tmdbId: 578, title: "Jaws", year: 1975, posterPath: null, tier: 1 },
  { tmdbId: 105, title: "Back to the Future", year: 1985, posterPath: null, tier: 2 },
  { tmdbId: 85, title: "Raiders of the Lost Ark", year: 1981, posterPath: null, tier: 3 },
  { tmdbId: 78, title: "Blade Runner", year: 1982, posterPath: null, tier: 4 },
];

type TileSeed = [filmId: number, type: PuzzleTile["type"], label: string, glyph: string, hue: number];

const TILES: TileSeed[] = [
  [578, "still", "Still: the fin", "🦈", 200],
  [578, "still", "Still: the Orca at sea", "🛥️", 190],
  [578, "prop", "Prop: yellow barrels", "🛢️", 45],
  [578, "headshot", "Roy Scheider", "👮", 25],
  [105, "headshot", "Christopher Lloyd", "🧑‍🔬", 280],
  [105, "headshot", "Michael J. Fox", "😎", 15],
  [105, "prop", "Prop: red electric guitar", "🎸", 350],
  [105, "empty_set", "Location: clock tower square", "🕰️", 230],
  [85, "headshot", "Harrison Ford", "🤠", 35],
  [85, "headshot", "Karen Allen", "👩", 330],
  [85, "prop", "Prop: golden idol", "🗿", 50],
  [85, "still", "Still: the Well of Souls", "🐍", 110],
  [78, "headshot", "Harrison Ford", "🕵️", 260],
  [78, "prop", "Prop: origami unicorn", "🦄", 300],
  [78, "empty_set", "Location: rain-soaked city", "🌃", 240],
  [78, "still", "Still: tears in rain", "🌧️", 210],
];

/** The sample tiles, given ids by the caller so every inserted copy is distinct. */
export function sampleTiles(newId: () => string): PuzzleTile[] {
  return TILES.map(([filmId, type, label, glyph, hue]) => ({
    id: newId(),
    filmId,
    type,
    label,
    image: { kind: "placeholder", glyph, hue },
  }));
}

/** Warm-up films for the sample puzzle: none of them is in the grid. */
export const SAMPLE_WARMUP_FILMS = [
  { tmdbId: 562, title: "Die Hard", year: 1988 },
  { tmdbId: 771, title: "Home Alone", year: 1990 },
  { tmdbId: 621, title: "Grease", year: 1978 },
  { tmdbId: 703, title: "Annie Hall", year: 1977 },
  { tmdbId: 38, title: "Eternal Sunshine of the Spotless Mind", year: 2004 },
];

type WarmupSeed = Omit<WarmupEntry, "id" | "position" | "answer">;

export const SAMPLE_WARMUP: WarmupSeed[] = [
  { filmId: 562, foreignTitle: "Duro de matar", language: "es", country: "MX", literalTranslation: "Hard to Kill" },
  {
    filmId: 771,
    foreignTitle: "Mi pobre angelito",
    language: "es",
    country: "MX",
    literalTranslation: "My Poor Little Angel",
  },
  { filmId: 621, foreignTitle: "Vaselina", language: "es", country: "AR", literalTranslation: "Vaseline" },
  {
    filmId: 703,
    foreignTitle: "Der Stadtneurotiker",
    language: "de",
    country: "DE",
    literalTranslation: "The City Neurotic",
  },
  {
    filmId: 38,
    foreignTitle: "Se mi lasci ti cancello",
    language: "it",
    country: "IT",
    literalTranslation: "If You Leave Me I Delete You",
  },
];
