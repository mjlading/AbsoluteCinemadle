/** A round as the client gets it before the guess: who, in what, as whom. Never the year, birthday or age. */
export interface PublicHowOldRound {
  actor: string;
  title: string;
  character: string;
  posterUrl: string;
  /** Only present when RULES.howOld.hideYear is off. */
  year?: number;
}

export interface PublicHowOldBoard {
  id: string;
  /** The day it is the daily board (YYYY-MM-DD). */
  date: string;
  rounds: PublicHowOldRound[];
}

/** The server's reveal for one round. */
export interface HowOldReveal {
  age: number;
  year: number;
  points: number;
}
