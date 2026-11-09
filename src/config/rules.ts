/** Game rules that are not point values (those live in scoring.ts). */
export const RULES = {
  grid: {
    groupCount: 4,
    groupSize: 4,
    maxMistakes: 4,
    maxSoundHints: 2,
    maxReviewHints: 2,
  },
  warmup: {
    titleCount: 5,
    timeLimitSeconds: 60,
  },
  keywordCollage: {
    /** Close-ups in one keyword's collage, shown as a 2x2 grid. */
    tilesPerCollage: 4,
    /** The game is lost on this many wrong guesses. */
    maxGuesses: 6,
    /** "Enhance" widens one tile's crop per game, by this factor. */
    enhancesPerGame: 1,
    enhanceFactor: 1.5,
  },
  soundbytes: {
    /** Film or actor guesses per board; only the right film wins. */
    maxGuesses: 3,
    /** How long a press must last to buy a node or remove a disguise. */
    holdMs: 700,
  },
  castingCall: {
    /** Actors' faces on a board. */
    faceCount: 8,
    /** Film guesses per board; crossing out every face within them wins. */
    maxGuesses: 5,
    /** The bar's length; it starts on Start and refills on any film with someone from the board. */
    timeLimitSeconds: 40,
  },
} as const;
