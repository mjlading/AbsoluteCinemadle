import type { PublicSeason } from "./chart";

/** What the client gets of a day's board: charts and option titles, never which option is right. */
export interface PublicRatingsCliffBoard {
  id: string;
  date: string;
  rounds: PublicRound[];
}

export interface PublicRound {
  seasons: PublicSeason[];
  options: { id: string; title: string }[];
}

/** The server's answer to one pick. */
export interface RatingsCliffGuessResult {
  correctOption: string;
  /** The series with its years, e.g. "Game of Thrones (2011–2019)". */
  series: string;
  reveal: string;
}
