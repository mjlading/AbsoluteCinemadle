/** Close-Ups gives one guess per keyword, so the two counts below must stay equal. */
const CLOSE_UPS_KEYWORDS = 5;

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
  closeUps: {
    /** Keywords in one puzzle; each miss or skip opens the next. */
    keywordsPerPuzzle: CLOSE_UPS_KEYWORDS,
    /** Guesses per game, one per keyword; a skip uses one, and the game is lost when they run out. */
    maxGuesses: CLOSE_UPS_KEYWORDS,
    /** Close-ups in one keyword's collage, shown as a 2x2 grid. */
    tilesPerCollage: 4,
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
