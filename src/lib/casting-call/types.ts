/** A board as the client gets it: faces by opaque id only, no names or TMDB ids. */
export interface PublicCastingBoard {
  id: string;
  name: string;
  faces: { id: string; imageUrl: string }[];
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
