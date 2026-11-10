/**
 * Every point value in the game.
 * Nothing else may hardcode a score; import from here instead.
 */
export const POINTS = {
  grid: {
    base: 100,
    perMistake: -10,
    perFlip: -5,
    perSoundHint: -15,
    perReviewHint: -10,
  },
  warmup: {
    perCorrectTitle: 10,
  },
  barcode: {
    perCorrectMatch: 10,
  },
  closeUps: {
    /** Points for a win on the first clue's keyword, before the bonus. */
    start: 4,
    /** Each earlier miss or skip costs this much. */
    perMissOrSkip: -1,
    /** Extra points for a win on the very first guess. */
    firstClueBonus: 2,
  },
} as const;
