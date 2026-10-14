export const TILE_TYPES = ["headshot", "still", "empty_set", "prop"] as const;
export type TileType = (typeof TILE_TYPES)[number];

/** Difficulty tier of a group: 1 is the easiest, 4 the hardest. */
export type Tier = 1 | 2 | 3 | 4;
export const TIERS: readonly Tier[] = [1, 2, 3, 4];

/** A rectangle within a source image, as fractions (0 to 1) of its width and height. */
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How a tile's picture is produced. TMDB images are always shown through a
 * square crop rendered on the server; placeholders are emoji art for dev and tests.
 */
export type TileImage =
  | { kind: "tmdb"; source: "profile" | "backdrop"; path: string; crop: Crop }
  | { kind: "placeholder"; glyph: string; hue: number };

export interface PuzzleFilm {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  tier: Tier;
}

export interface PuzzleTile {
  /** Opaque id; must not hint at the film. */
  id: string;
  filmId: number;
  type: TileType;
  /** Revealed when the player flips the tile: an actor name or a short description. */
  label: string;
  image: TileImage;
}

/**
 * A puzzle as the server holds it, answers included.
 * Never send this to the client; use toPublicPuzzle.
 */
export interface Puzzle {
  id: string;
  /** The day it is played, or null while it is an unscheduled draft. */
  date: string | null;
  films: PuzzleFilm[];
  /** In display order. */
  tiles: PuzzleTile[];
}

// Shapes below are safe to send to the client.

export interface PublicTile {
  id: string;
  /** Stable 1-based number used in alt text ("Tile 7, prop close-up"). */
  number: number;
  type: TileType;
  imageUrl: string;
}

export interface PublicPuzzle {
  /** The day being played; for an admin preview, the scheduled date or today. */
  date: string;
  tiles: PublicTile[];
}

export interface SolvedGroup {
  filmId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  tier: Tier;
  tileIds: string[];
}

export type GuessResult = { kind: "correct"; group: SolvedGroup } | { kind: "one_away" } | { kind: "wrong" };
