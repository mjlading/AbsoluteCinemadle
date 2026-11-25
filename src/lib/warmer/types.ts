export interface WarmerFilm {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  /** TMDB's short description. */
  overview: string;
}

export interface RankedFilm {
  film: WarmerFilm;
  /** 1 is the hidden film itself. */
  rank: number;
  /** A hint the server gave, not a guess. */
  hint?: boolean;
}

/** Facts about the hidden film, unlocked as the guesses add up. */
export type WarmerClue = { kind: "decade"; value: string } | { kind: "genres"; value: string };

export interface WarmerDay {
  date: string;
  /** Films in the pool, so the worst rank there is. */
  total: number;
}
