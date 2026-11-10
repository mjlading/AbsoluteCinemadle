/** What a node's clip is: a line of dialogue, a piece of the score or a sound effect. */
export const SOUND_CATEGORIES = ["dialogue", "score", "sfx"] as const;
export type SoundCategory = (typeof SOUND_CATEGORIES)[number];

/** Frames a second of a clip's mouth track. */
export const MOUTH_FPS = 25;

/** A clip as the client gets it. */
export interface Clip {
  url: string;
  /** Where to start playing, in seconds: a theme is a window of a longer preview. Absent means the start. */
  start?: number;
  /** Length in seconds, so the ring can show it before the clip has loaded. */
  seconds: number;
  /**
   * How loud the voice alone is, one digit (0 to 9) per frame at MOUTH_FPS, so the characters talk to the
   * words and not to the soundtrack under them. Absent for clips without one; they get a made-up rhythm.
   */
  mouth?: string;
}

/** A clip as the server keeps it: a file in the database, served under its opaque id. */
export interface HostedClip {
  id: string;
  contentType: string;
  seconds: number;
  mouth?: string;
}

/** The film's theme: a window of an iTunes preview, played from Apple's servers. */
export interface AppleClip {
  url: string;
  start: number;
  seconds: number;
}

export type StoredClip = HostedClip | AppleClip;

/** What a node's clip was cut from, kept on the server so a takedown request can be traced: never sent to players. */
export interface ClipSource {
  kind: "youtube" | "itunes" | "generated";
  id: string;
  /** Seconds into the source. */
  at: number;
}

interface NodeFields {
  /** Opaque id; must not hint at the film. */
  id: string;
  /**
   * Its line's place in the order lines open, and its fixed position on the board: slot 0 is the larger
   * center slot, open from the start; each wrong guess or skip opens the next.
   */
  slot: number;
  /** "Line 1" and so on; never a name. */
  label: string;
  category: SoundCategory;
  /** Optional picture for the node; null shows the category's icon. */
  art: string | null;
}

/** A node as the server holds it. */
export interface StoredSoundNode extends NodeFields {
  clip: StoredClip;
  source: ClipSource;
}

/** A node as the client gets it. */
export interface SoundNode extends NodeFields {
  clip: Clip;
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
  /** Spoiler-free name, e.g. "Demo 1". */
  name: string;
  /** The day it is the daily board (YYYY-MM-DD), or null for an undated one, which players never see. */
  date: string | null;
  answer: {
    tmdbId: number;
    title: string;
    year: number | null;
    posterPath: string | null;
    /** Top-billed cast; guessing one of them earns the actor bonus. */
    cast: CastMember[];
    /** The theme's Apple Music page, or null for a board without a theme. */
    themeUrl: string | null;
  };
  nodes: StoredSoundNode[];
}

// Shapes below are safe to send to the client.

export interface PublicSoundbytesBoard {
  id: string;
  name: string;
  date: string | null;
  /** In the order their lines open. */
  nodes: SoundNode[];
}

/** A day with a board, for the archive. */
export interface SoundbytesDay {
  id: string;
  date: string;
}

export interface SoundbytesAnswer {
  title: string;
  year: number | null;
  posterUrl: string | null;
  /** The theme's Apple Music page, when the board has a theme; Apple's terms want previews to link to it. */
  themeUrl: string | null;
}

/** A suggestion the player picked: guesses only count when picked, so their kind is always known. */
export type GuessPick =
  | { kind: "film"; tmdbId: number; title: string; year: number | null }
  | { kind: "person"; tmdbId: number; name: string };

export type SoundbytesGuessResult =
  | { correct: true; kind: "film"; answer: SoundbytesAnswer }
  | { correct: true; kind: "person"; name: string }
  | { correct: false };
