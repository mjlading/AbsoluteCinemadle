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
  soundbytes: {
    /** Points a board starts with; buying nodes and removing disguises spend them. */
    start: 1000,
    /** Buying a locked node opens its disguised clip. */
    buy: -100,
    /** Removing a node's disguise opens its real clip. */
    reveal: -100,
    /** Naming an actor from the film's cast; it uses a guess but does not end the game. */
    perCorrectActor: 150,
  },
} as const;
