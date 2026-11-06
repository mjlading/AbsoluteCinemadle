/** What a node's clip is: a line of dialogue, a piece of the score or a sound effect. */
export const SOUND_CATEGORIES = ["dialogue", "score", "sfx"] as const;
export type SoundCategory = (typeof SOUND_CATEGORIES)[number];

/** How the short clip is disguised: helium voice, kazoo cover or muffled behind a door. */
export const DISGUISES = ["helium", "kazoo", "muffle"] as const;
export type Disguise = (typeof DISGUISES)[number];

/** The surface the board's nodes are pinned to. */
export const BOARD_SURFACES = ["corkboard", "sand", "starfield", "asphalt"] as const;
export type BoardSurface = (typeof BOARD_SURFACES)[number];

export interface Clip {
  url: string;
  /** Length in seconds, so the ring can show it before the clip has loaded. */
  seconds: number;
}

export interface SoundNode {
  /** Opaque id; must not hint at the film. */
  id: string;
  /** Fixed position on the board; slot 0 is the larger center slot and holds the free node. */
  slot: number;
  /** A short clue, e.g. "Villain". */
  label: string;
  category: SoundCategory;
  disguise: Disguise;
  /** Optional picture for the node; null shows the category's icon. */
  art: string | null;
  /** The starter node everyone gets for free, already bought; exactly one per board. */
  free: boolean;
  clips: { disguised: Clip; real: Clip };
}

export interface CastMember {
  tmdbId: number;
  name: string;
}

/**
 * A board as the server holds it, answer included.
 * Never send this to the client; use toPublicBoard.
 */
export interface SoundbytesBoard {
  id: string;
  /** Spoiler-free name shown in the board list, e.g. "Demo 1". */
  name: string;
  background: BoardSurface;
  answer: {
    tmdbId: number;
    title: string;
    year: number | null;
    posterPath: string | null;
    /** Top-billed cast; guessing one of them earns the actor bonus. */
    cast: CastMember[];
  };
  nodes: SoundNode[];
}

// Shapes below are safe to send to the client.

export interface PublicSoundNode extends SoundNode {
  /** Points to buy it (0 for the free node) and to remove its disguise, from the scoring config. */
  buyCost: number;
  revealCost: number;
}

export interface PublicSoundbytesBoard {
  id: string;
  name: string;
  background: BoardSurface;
  nodes: PublicSoundNode[];
}

export interface SoundbytesAnswer {
  title: string;
  year: number | null;
  posterUrl: string | null;
}

/** A suggestion the player picked: guesses only count when picked, so their kind is always known. */
export type GuessPick =
  | { kind: "film"; tmdbId: number; title: string; year: number | null }
  | { kind: "person"; tmdbId: number; name: string };

export type SoundbytesGuessResult =
  | { correct: true; kind: "film"; answer: SoundbytesAnswer }
  | { correct: true; kind: "person"; name: string }
  | { correct: false };
