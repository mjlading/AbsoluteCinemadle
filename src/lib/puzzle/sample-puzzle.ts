import type { PuzzleFilm, PuzzleTile, Tier, WarmupEntry } from "./types";

/**
 * A puzzle with emoji placeholder art, for development seeds and tests.
 * Harrison Ford appears in two groups on purpose, as a red herring.
 */
export const SAMPLE_FILMS: PuzzleFilm[] = [
  sampleFilm(578, "Jaws", 1975, 1, ["#0e2a3c", "#1d4f6e", "#3f7fa6", "#9cc7d8", "#d8c79a"]),
  sampleFilm(105, "Back to the Future", 1985, 2, ["#2a1c3d", "#6b2f7a", "#c2492f", "#e98a2b", "#f3c76b"]),
  sampleFilm(85, "Raiders of the Lost Ark", 1981, 3, ["#2b1d12", "#5c3a1e", "#8a5a2b", "#b98a4d", "#e0c38c"]),
  sampleFilm(78, "Blade Runner", 1982, 4, ["#0b1a24", "#123c4a", "#1f6f7a", "#c86b2a", "#e9a14b"]),
];

/**
 * Sample films carry a hand-made palette, so the bonus round works without
 * TMDB; the seed replaces it with a generated one when TMDB is reachable.
 */
function sampleFilm(tmdbId: number, title: string, year: number, tier: Tier, colors: string[]): PuzzleFilm {
  return { tmdbId, title, year, posterPath: null, tier, barcode: { id: `sample-${tmdbId}`, colors, upload: false } };
}

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
