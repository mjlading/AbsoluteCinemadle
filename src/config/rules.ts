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
    maxGuesses: 6,
    /** The bar's length; it starts on Start and refills on any film with someone from the board. */
    timeLimitSeconds: 50,
    /**
     * How the daily board is built (src/lib/casting-call/generate.ts): well-known actors in groups,
     * each group sharing a lesser-known film, so the best route takes one film per group.
     * How well known a film is goes by its rank among all films by TMDB vote count (animation and
     * documentaries left out), not by a fixed vote count, since every film's votes keep growing.
     */
    board: {
      /**
       * The group sizes a board can have, and how often each comes up (3 in 4 days are 3+3+2).
       * Each adds up to faceCount; if the day's layout can't be built, the other is tried.
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
       * blockbuster (about 16,800 to 5,200 votes in November 2026).
       * No two in a group may share a film ranked above `from`.
       */
      sharedFilmRanks: { from: 120, to: 900 },
      /** Everyone in a group is billed this high (TMDB cast order from 0) in the film they share. */
      sharedFilmOrder: 5,
      /** Actors and films used on a board aren't used again within this many days either side. */
      cooldownDays: 60,
    },
  },
  /** Ratings Cliff: name the series from its episode ratings (docs/RATINGS-CLIFF.md). */
  ratingsCliff: {
    /** Series per day. */
    rounds: 5,
    /** Series to choose between in a round, the right one included. */
    options: 4,
    /**
     * The chart colours each episode by its rating: the lowest rating of each band, best first; anything
     * lower is the worst band. Measured on 2026-11-15 over 897 charted episodes: a tenth rate under 6.3,
     * half under 7.9, a tenth over 8.6 and one in fifty 9.0 or more.
     */
    chartBands: [9, 8.5, 8, 7, 6],
    /**
     * How a day's board is built (src/lib/ratings-cliff/build.ts): well-known scripted series come from
     * TMDB's TV discover list by vote count; a seeded handful of them are looked up in full, and the ones
     * whose episode ratings make a readable, interesting chart become the day's answers.
     */
    board: {
      /** Pages of 20 series by TMDB vote count the pool is drawn from (about 2,000 votes and up in November 2026). */
      poolPages: 10,
      /** A series not originally in English needs this many TMDB votes (Squid Game, Money Heist), so local hits stay out. */
      foreignMinVotes: 8000,
      /**
       * TMDB TV genres left out: news, reality, soap, talk, kids and documentary. Animation is kept only for
       * English-language series (The Simpsons, Rick and Morty), which keeps long anime out.
       */
      excludedGenres: [10763, 10764, 10766, 10767, 10762, 99],
      animationGenre: 16,
      /** Series from the pool looked up per day (one details call each); answers and wrong options come from these. */
      candidates: 40,
      /** At most this many candidates get every season fetched, the day's answers chosen among the ones that qualify. */
      maxChartFetches: 16,
      /** A series needs at least this many seasons with rated episodes. */
      minSeasons: 2,
      /** And at least this many rated episodes. */
      minEpisodes: 12,
      /** More episodes than this makes the chart unreadable (Grey's Anatomy, The Simpsons). */
      maxEpisodes: 250,
      /**
       * An episode's TMDB rating counts with at least this many votes; below it, it is left off the chart.
       * Measured on 2026-11-15: Game of Thrones' episodes have 200+ votes, The Office's 30 to 75,
       * Modern Family's 14 to 40, It's Always Sunny's 9 to 60.
       */
      episodeMinVotes: 15,
      /** A series is dropped when more than this share of its aired episodes falls under `episodeMinVotes`. */
      maxThinShare: 0.1,
      /**
       * How interesting a chart is: the spread of its episode ratings (5th to 95th percentile), the gap
       * between its best and worst season averages, and how far its best and worst episodes stand out
       * from the median, added up. Charts scoring under `minShape` are flat lines and are left out;
       * the rest are drawn with odds growing with their score and the square root of their TMDB votes.
       * Measured on 2026-11-15: Narcos and Loki score 2.1, Dark 2.6, Breaking Bad 3.5, Futurama 7.3,
       * Game of Thrones 9.2.
       */
      minShape: 3,
      /** At most this many answers on a board share their main TMDB genre, so a day isn't all sitcoms. */
      maxSameGenre: 2,
      /** A series that was a day's answer isn't an answer again within this many days either side (it may be a wrong option). */
      cooldownDays: 14,
      /**
       * When the days around are so full that too few series are left (the pool is about 150 shows and a
       * fortnight either side holds up to 140 answers), the window shrinks to these, in turn.
       */
      cooldownFallbackDays: [10, 7, 4, 0],
    },
  },
} as const;
