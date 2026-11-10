import type { Crop, TileImage } from "@/lib/puzzle/types";

/**
 * How much a keyword's close-ups give the film away, which sets where it falls in the reveal order:
 * hard keywords are atmospheric (hands, doors, chairs), medium ones contextual
 * (vehicles, food, guns), easy ones close to the characters (mouths, hair, signs).
 */
export const COLLAGE_TIERS = ["hard", "medium", "easy"] as const;
export type CollageTier = (typeof COLLAGE_TIERS)[number];

export interface CollageTile {
  /** Opaque id; must not hint at the film. */
  id: string;
  /** A square crop of a backdrop (or a placeholder in tests), always rendered on the server. */
  image: TileImage;
  /** The backdrop's size in pixels, needed to widen the crop and to zoom out to the frame. */
  frame: { width: number; height: number };
}

export interface CollageKeyword {
  /** Opaque id. */
  id: string;
  /** What the player reads, e.g. "Hands". */
  label: string;
  tier: CollageTier;
  /** The starter collage everyone sees for free; exactly one per puzzle. */
  free: boolean;
  tiles: CollageTile[];
}

/**
 * A keyword collage puzzle as the server holds it, answer included.
 * Never send this to the client; use toPublicCollage.
 */
export interface CollagePuzzle {
  id: string;
  /** Spoiler-free name, e.g. "Demo 1". */
  name: string;
  /** The day it is the daily puzzle (YYYY-MM-DD), or null for an undated one (the old demos), which players never see. */
  date: string | null;
  answer: {
    tmdbId: number;
    title: string;
    originalTitle: string | null;
    year: number | null;
    posterPath: string | null;
  };
  /** In reveal order (see order.ts), exactly keywordsPerPuzzle of them. */
  keywords: CollageKeyword[];
}

// Shapes below are safe to send to the client.

/** One day's puzzle in the archive. */
export interface CollageDay {
  date: string;
  id: string;
}

export interface PublicCollageTile {
  id: string;
  /** 1-based position in its collage, used in alt text ("Hands, close-up 2 of 4"). */
  number: number;
  imageUrl: string;
  /** The same tile with its crop widened, for the one "Enhance" per game. */
  enhancedUrl: string;
}

export interface PublicCollageKeyword {
  id: string;
  label: string;
  tiles: PublicCollageTile[];
}

export interface PublicCollagePuzzle {
  id: string;
  name: string;
  date: string | null;
  keywords: PublicCollageKeyword[];
}

export interface CollageAnswer {
  title: string;
  year: number | null;
  posterUrl: string | null;
}

export type CollageGuessResult = { correct: true; answer: CollageAnswer } | { correct: false };

/** Everything the end-of-game zoom-out needs: each tile's full frame and where its crop sits in it. */
export interface CollageSolution {
  answer: CollageAnswer;
  frames: { tileId: string; frameUrl: string; crop: Crop; aspect: number }[];
}
