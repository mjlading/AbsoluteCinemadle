/* What Deep Cut's API sends the player. */

export interface PublicDeepCutBoard {
  id: string;
  date: string;
  /** The day's prompts, as text only. */
  prompts: { text: string }[];
}

export interface FilmTitle {
  tmdbId: number;
  title: string;
  year: number | null;
}

/** A film shown in a reveal, with what it would have scored. */
export interface RevealFilm extends FilmTitle {
  score: number;
}

export interface DeepCutReveal {
  /** The best-known film that fits: it scores 0. */
  mostObvious: RevealFilm;
  /** A little-known film that fits, to learn from. */
  deepCut: RevealFilm;
}

export type Misfit = "documentary" | "short" | "no";

export type DeepCutGuessResult =
  | { fits: false; film: FilmTitle; why: Misfit; triesLeft: number }
  | ({
      fits: true;
      film: FilmTitle;
      score: number;
      /** The share of the films that fit that are better known than this one, 0 to 100. */
      percentile: number;
    } & DeepCutReveal);
