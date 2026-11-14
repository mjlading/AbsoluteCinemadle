/** Close-Ups gives one guess per keyword, so the two counts below must stay equal. */
const CLOSE_UPS_KEYWORDS = 4;

/** Game rules that are not point values (those live in scoring.ts). */
export const RULES = {
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
    /**
     * Lines per board, and so tries: line 1 is open from the start, and each wrong guess or skip opens the next.
     * A wrong or skipped try with every line open ends the game.
     */
    lines: 5,
  },
  castingCall: {
    /** Actors' faces on a board. */
    faceCount: 8,
    /** Film guesses per board; crossing out every face within them wins. */
    maxGuesses: 5,
    /** The bar's length; it starts on Start and refills on any film with someone from the board. */
    timeLimitSeconds: 40,
    /**
     * How the daily board is built (src/lib/casting-call/generate.ts): well-known actors in pairs,
     * each pair sharing a lesser-known film, so the best route takes one film per pair.
     */
    board: {
      /** Pairs on a board; times two it must equal faceCount. */
      pairs: 4,
      /** The fewest films that may clear a board, counting every film the eight are in. */
      minFilmsToClear: 4,
      /** A film counts as well known from this many TMDB votes. */
      wellKnownVotes: 3000,
      /** Billed this high (TMDB cast order from 0) counts as a starring role. */
      starringOrder: 3,
      /**
       * An actor is well known with at least this many starring roles in well-known films.
       * Measured on 2026-11-14: Kevin Dunn and Clea DuVall have 1, Rebecca Hall 7, Michelle Pfeiffer 9, Tom Hanks 26.
       */
      wellKnownRoles: 8,
      /** The film a pair shares has at least `min` TMDB votes (so it can be found) and fewer than `max`. */
      sharedFilmVotes: { min: 300, max: 2500 },
      /** Both actors are billed this high (TMDB cast order from 0) in the film they share. */
      sharedFilmOrder: 5,
      /** Actors and films used on a board aren't used again within this many days either side. */
      cooldownDays: 60,
    },
  },
} as const;
