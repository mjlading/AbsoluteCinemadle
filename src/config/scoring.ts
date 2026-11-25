/**
 * Every point value in the game.
 * Nothing else may hardcode a score; import from here instead.
 */
export const POINTS = {
  closeUps: {
    /** Points for a win on the first clue's keyword, before the bonus. */
    start: 4,
    /** Each earlier miss or skip costs this much. */
    perMissOrSkip: -1,
    /** Extra points for a win on the very first guess. */
    firstClueBonus: 2,
  },
  /** Casting call, for the leaderboard: a point per actor crossed out, and on a win one more per guess left over. */
  castingCall: {
    perFace: 1,
    perGuessLeftOnWin: 1,
  },
  /** Ratings Cliff: one point per series named right. */
  ratingsCliff: {
    perCorrect: 1,
  },
} as const;
