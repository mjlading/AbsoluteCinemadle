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
  keywordCollage: {
    /** Points a game starts with; unlocking keywords and wrong guesses spend them. */
    start: 1000,
    perWrongGuess: -50,
    /**
     * Cost of unlocking a keyword, by how much its close-ups give away:
     * hard (atmospheric: hands, doors, chairs) is cheap, easy (mouths, hair, signs) is dear.
     */
    unlock: { hard: -100, medium: -200, easy: -350 },
  },
} as const;
