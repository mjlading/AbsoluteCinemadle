export const LEADERBOARD_GAMES = ["close-ups", "casting-call", "ratings-cliff"] as const;
export type LeaderboardGame = (typeof LEADERBOARD_GAMES)[number];

/** A replayed game, as the leaderboard records it. */
export interface LeaderboardResult {
  score: number;
  won: boolean;
  /** Spoiler-free, e.g. "Got it on clue 2", "8/8 in 5 films", "4/5". */
  summary: string;
}

export interface DailyEntry {
  name: string;
  score: number;
  won: boolean;
  summary: string;
  /** This browser's own entry. */
  mine: boolean;
}

export interface AllTimeRow {
  name: string;
  days: number;
  wins: number;
  total: number;
}

export interface AllTimeBoards {
  overall: AllTimeRow[];
  games: Record<LeaderboardGame, AllTimeRow[]>;
}
