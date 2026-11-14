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
    /** Actors a player may fire per game: taken off the board as done, without a guess. */
    firesPerGame: 1,
    /**
     * How the daily board is built (src/lib/casting-call/generate.ts): well-known actors in groups,
     * each group sharing a lesser-known film, so the best route takes one film per group.
     * How well known a film is goes by its rank among all films by TMDB vote count (animation and
     * documentaries left out), not by a fixed vote count, since every film's votes keep growing.
     */
    board: {
      /**
       * The group sizes a board can have, and how often each comes up (3 in 4 days are 3+3+2).
       * Each adds up to faceCount; if the day's layout can't be built, the next is tried, all pairs last.
       * A board must take as many films to clear as it has groups, counting every film the actors are in.
       */
      layouts: [
        { groups: [3, 3, 2], weight: 3 },
        { groups: [2, 2, 2, 2], weight: 1 },
      ],
      /** Groups are found through the leads of the films ranked this high. */
      leadFilmRank: 400,
      /** A film counts as well known when ranked this high (about 3,000 votes in November 2026). */
      wellKnownRank: 1750,
      /** Billed this high (TMDB cast order from 0) counts as a starring role. */
      starringOrder: 3,
      /**
       * An actor is well known with at least this many starring roles in well-known films.
       * Measured on 2026-11-14: Kevin Dunn and Clea DuVall have 1, Rebecca Hall 7, Michelle Pfeiffer 9, Tom Hanks 26.
       */
      wellKnownRoles: 8,
      /**
       * The film a group shares ranks below `from` and no lower than `to`: widely seen, but not a top
       * blockbuster (about 15,000 to 4,250 votes in November 2026, Alice in Wonderland to Babel).
       * No two in a group may share a film ranked above `from`.
       */
      sharedFilmRanks: { from: 150, to: 1200 },
      /** Everyone in a group is billed this high (TMDB cast order from 0) in the film they share. */
      sharedFilmOrder: 5,
      /** Actors and films used on a board aren't used again within this many days either side. */
      cooldownDays: 60,
    },
  },
} as const;
