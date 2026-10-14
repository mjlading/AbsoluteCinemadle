export const TILE_TYPES = ["headshot", "still", "empty_set", "prop"] as const;
export type TileType = (typeof TILE_TYPES)[number];

/** Difficulty tier of a group: 1 is the easiest, 4 the hardest. */
export type Tier = 1 | 2 | 3 | 4;

/** How a tile's picture is produced. Phase 2 adds TMDB images with optional crops. */
export type TileImage = { kind: "placeholder"; glyph: string; hue: number };

export interface PuzzleFilm {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  tier: Tier;
}

export interface PuzzleTile {
  /** Opaque id; must not hint at the film. */
  id: string;
  filmId: string;
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
  date: string;
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
  date: string;
  tiles: PublicTile[];
}

export interface SolvedGroup {
  filmId: string;
  title: string;
  year: number;
  tier: Tier;
  tileIds: string[];
}

export type GuessResult =
  | { kind: "correct"; group: SolvedGroup }
  | { kind: "one_away" }
  | { kind: "wrong" };
