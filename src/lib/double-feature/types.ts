import type { QuestionKind } from "./questions";

/** One film as the player sees it before picking: no value for the question, and no year in "came out first" rounds. */
export interface PublicOption {
  /** Opaque: "a" or "b", the side it is shown on. */
  id: string;
  title: string;
  posterUrl: string;
  year: number | null;
}

export interface PublicRound {
  kind: QuestionKind;
  options: [PublicOption, PublicOption];
}

export interface PublicDoubleFeatureBoard {
  id: string;
  date: string;
  rounds: PublicRound[];
}

/** The server's answer to a pick: the winning option and both films' values for the round's question. */
export interface DoubleFeatureReveal {
  correctOption: string;
  /** By option id: "2h 22m", "$63 million", "8.4", "1994". */
  values: Record<string, string>;
  /** Both films' years, shown after a "came out first" round too. */
  years: Record<string, number>;
}
