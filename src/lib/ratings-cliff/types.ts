import type { ChartSeason, PublicSeason } from "./chart";

/**
 * One round of a stored board, answer included: a series' chart and four
 * titles to choose from. Only the server ever reads it whole.
 */
export interface RatingsCliffRound {
  seriesId: number;
  title: string;
  firstYear: number | null;
  lastYear: number | null;
  seasons: ChartSeason[];
  /** In display order; each has an opaque id that says nothing about which is right. */
  options: { id: string; seriesId: number; title: string }[];
  /** The id of the right option. */
  answer: string;
  /** One line for the reveal, built from the chart's numbers. */
  reveal: string;
}

/** One day in the archive. */
export interface RatingsCliffDay {
  date: string;
  id: string;
}

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
