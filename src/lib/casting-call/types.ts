/** A board as the client gets it: faces by opaque id only, no names or TMDB ids. */
export interface PublicCastingBoard {
  id: string;
  /** The day it is the daily board (YYYY-MM-DD). */
  date: string;
  faces: { id: string; imageUrl: string }[];
}

/** A day with a board, for the archive. */
export interface CastingCallDay {
  id: string;
  date: string;
}

export interface GuessedFilm {
  tmdbId: number;
  title: string;
  year: number | null;
}

/** A face the player has earned, with the actor's name. */
export interface FoundFace {
  faceId: string;
  name: string;
}

export interface CastingGuessResult {
  film: GuessedFilm;
  /** Faces on the board that are in this film's cast; empty for a miss. */
  found: FoundFace[];
}

/** The board's best route, once the game is over: one lesser-known film per pair of faces. */
export interface CastingBestRoute {
  films: (GuessedFilm & { faceIds: string[] })[];
}
