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
  },
  warmup: {
    perCorrectTitle: 10,
  },
  barcode: {
    perCorrectMatch: 10,
  },
} as const;
