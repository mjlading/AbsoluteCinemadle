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
  /** Prototype: guess a still's release year. */
  carbonDating: {
    /** Stills per day. */
    rounds: 5,
    /** The earliest year the slider offers; the latest is the current year. */
    minYear: 1930,
    /**
     * The decades a board draws from, each with the TMDB vote count a film needs
     * to be famous enough for it. Older decades have fewer votes, so their floors
     * are lower; each floor leaves roughly 40 to 450 films (November 2026).
     * A board takes `rounds` different decades, so it is never all recent films.
     */
    decades: [
      { from: 1940, minVotes: 600 },
      { from: 1950, minVotes: 800 },
      { from: 1960, minVotes: 1000 },
      { from: 1970, minVotes: 1500 },
      { from: 1980, minVotes: 2500 },
      { from: 1990, minVotes: 3000 },
      { from: 2000, minVotes: 4000 },
      { from: 2010, minVotes: 5000 },
      { from: 2020, minVotes: 3000 },
    ],
    /** TMDB genres left out: animation and documentaries can't be dated by their look, nor TV films. */
    excludedGenres: [16, 99, 10770],
    /** Feature films only: shorter films (La Jetée and the like) are left out. Minutes. */
    minRuntime: 60,
    /** A film needs this many textless, wide backdrops; fewer usually means poor or odd stills. */
    minBackdrops: 3,
    /** Backdrops narrower than this many pixels are skipped (the still is shown at TMDB's w1280). */
    minBackdropWidth: 1280,
    /**
     * Backdrops at least this wide (4K) are mostly studio key art (painted posters,
     * logos) rather than frames of the film, so they rank after every narrower one.
     */
    keyArtWidth: 3840,
    /** The still is drawn from this many of a film's best-ranked backdrops, so it isn't always the top one. */
    backdropChoices: 4,
    /** Films tried per decade before the board gives up on finding one with enough backdrops. */
    filmTries: 6,
    /**
     * The share text's squares by years off: within `close` is green, within
     * `near` yellow, within `far` orange, anything more red.
     */
    shareBands: { close: 1, near: 4, far: 9 },
  },
  /** Prototype: guess an actor's age when a film came out. */
  howOld: {
    /** Actors per day. */
    rounds: 5,
    /** The ages the player can pick between; roles outside them never make a board. */
    minAge: 5,
    maxAge: 95,
    /** Where the age picker starts each round. */
    startAge: 35,
    /** Hide the film's release year until the reveal, so the player estimates the actor's age rather than doing sums. */
    hideYear: true,
    /** Years off that still count as close or near in the share text (exact has its own mark). */
    share: { close: 2, near: 5 },
    /**
     * How a day's board is built (src/lib/how-old/generate.ts). Lead actors are gathered from
     * well-known films of every era; each one's own filmography then gives (actor, film) pairs,
     * which are bucketed by the actor's age and drawn so a board spreads its ages and eras.
     */
    board: {
      /** Seed films come from these decades' most-voted films (animation and documentaries left out), by weight. */
      decades: [
        { from: 1960, weight: 0.5 },
        { from: 1970, weight: 0.8 },
        { from: 1980, weight: 1 },
        { from: 1990, weight: 1 },
        { from: 2000, weight: 1 },
        { from: 2010, weight: 1 },
        { from: 2020, weight: 0.7 },
      ],
      /** Each decade's most-voted films that can seed a board. */
      filmsPerDecade: 60,
      /** Seed films per board; their leads are the board's candidate actors. */
      seedFilms: 20,
      /** Billed this high (TMDB cast order from 0) counts as a lead, both in seed films and in the round's film. */
      leadOrder: 2,
      /**
       * A round's film must rank this high among all films by TMDB vote count, so it is one people know
       * (about 3,000 votes in November 2026).
       */
      filmRank: 1500,
      /**
       * An actor is well known with at least `fameRoles` roles billed `fameOrder` or higher in films ranked
       * `fameRank` or higher. Measured on 2026-11-15: Macaulay Culkin and Haley Joel Osment have 4,
       * Henry Thomas 2, Mara Wilson 1, Natalie Portman 17.
       */
      fameRank: 3000,
      fameOrder: 3,
      fameRoles: 4,
      /** Age bands (the actor's age is below `below`), and how often a round is drawn from each. */
      ageBands: [
        { below: 20, weight: 1 },
        { below: 30, weight: 1.2 },
        { below: 40, weight: 1.2 },
        { below: 50, weight: 1 },
        { below: 200, weight: 1 },
      ],
      /** No more than this many rounds share an age band, and a board spans at least `minBands` of them. */
      maxPerBand: 2,
      minBands: 4,
      /** No more than this many rounds' films come from the same decade. */
      maxPerDecade: 2,
      /**
       * Favours surprising roles: a role this many years from the middle of the actor's well-known
       * career is twice as likely to be drawn (a child part, a late-career part, one from before they were famous).
       */
      surpriseYears: 10,
      /** An actor or film on a stored board this many days before or after is left out, when the board can do without. */
      cooldownDays: 7,
    },
  },
  /** Prototype: pick the film that wins the round's comparison. */
  doubleFeature: {
    /** Pairs of films per day. Every round is played; the question kinds take turns, each about as often. */
    rounds: 10,
    /**
     * How a day's board is built (src/lib/double-feature): films come from the `poolSize` films with the most
     * TMDB votes (documentaries left out); a seeded `candidates` of them are looked up in full and the
     * rounds' pairs are picked among those.
     */
    board: {
      /** Films by TMDB vote count the day's films come from (about 5,600 votes and up in November 2026). */
      poolSize: 600,
      /** Films drawn from the pool each day and looked up for their runtime, budget and revenue. */
      candidates: 120,
      /** A runtime below this many minutes is taken as missing; every film on a board has one. */
      minRuntimeMinutes: 60,
      /** Budgets and box office below this many dollars are taken as unknown (TMDB has 0 or junk for many). */
      minMoneyDollars: 1_000_000,
      /** A film's box office is only asked about once it has been out this many days (before the board's date). */
      revenueSettledDays: 180,
      /** Budget and box office rounds pair films released at most this many years apart (dollars aren't adjusted). */
      moneyMaxYearsApart: 15,
      /**
       * How far apart a pair's two values must be (`min`) and may be (`max`), and what counts as a close call
       * (`close`). Runtime in minutes, rating in TMDB points (rounded to 0.1), release in calendar years,
       * budget and revenue as the ratio of the larger to the smaller.
       */
      margins: {
        runtime: { min: 10, close: 20, max: 60 },
        rating: { min: 0.3, close: 0.6, max: 1.8 },
        release: { min: 2, close: 5, max: 30 },
        budget: { min: 1.25, close: 1.7, max: 5 },
        revenue: { min: 1.25, close: 1.7, max: 6 },
      },
      /**
       * Each round's pair is picked as one of these, by weight; a style with no fair pair falls back to any.
       * close: values near the minimum margin. surprise: intuition misleads, i.e. for budget, revenue and
       * rating the winner has far fewer votes than the loser, for runtime the winner is much older.
       * open: any fair pair.
       */
      styleWeights: { close: 0.35, surprise: 0.35, open: 0.3 },
      /** In a surprise round the winner has at most this share of the loser's TMDB votes. */
      surpriseVoteShare: 0.6,
      /** In a surprise runtime round the longer film is at least this many years older. */
      surpriseRuntimeYearsOlder: 10,
    },
  },
  /** Prototype: name the series from its episode ratings. */
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
    },
  },
  /** Prototype: name a fitting film few would think of. */
  deepCut: {
    /** Prompts per day. */
    rounds: 3,
    /** Films a player may name for one prompt before it scores 0; one that doesn't fit uses a try. */
    triesPerPrompt: 3,
    /**
     * How a day's prompts are built (src/lib/deep-cut/board.ts). Fame is a film's TMDB vote count;
     * documentaries and films shorter than `minRuntime` never fit.
     */
    board: {
      /**
       * The rarity scale runs from the set's most-voted film (0 points) down to this many votes (full points).
       * Films with fewer votes still fit but score no more than a film at the floor, so junk doesn't pay.
       * It is also the least a film needs to count in "Rarer than N% of the films that fit".
       */
      voteFloor: 50,
      /** Shorter than this many minutes is a short, which never fits (an unknown runtime is let through). */
      minRuntime: 40,
      /** Actors and directors are found through the films ranked this high by TMDB votes (as Casting call does). */
      candidateFilmRank: 400,
      /** An actor is picked from a candidate film's cast billed this high (TMDB order from 0). */
      leadOrder: 3,
      /** A film "counts" for a person's prompt with at least this many votes. */
      realFilmVotes: 100,
      /** An actor needs this many fitting films that count, and to be well known by Casting call's measure. */
      actorMinFilms: 15,
      /** A director needs this many directed feature films that count. */
      directorMinFilms: 10,
      /** An actor's most obvious answer is their most-voted film where they are billed this high (a cameo isn't it). */
      obviousBillingOrder: 10,
      /**
       * The deep-cut example in a reveal: the best-rated fitting film with at least `minVotes` votes (not junk)
       * that scores at least `minScore` (animation and TV films left out unless the prompt asks for animation;
       * for actors, billed this high).
       */
      deepCut: { minVotes: 250, minScore: 60 },
      /** A deep-cut example is at least this many years old, so a film isn't little known only because it is new. */
      deepCutMinAgeYears: 3,
      /** A person, theme or genre-and-decade on a board isn't used again on boards this many days either side. */
      repeatWindowDays: 10,
      deepCutBillingOrder: 5,
      /** Genre-and-decade and theme sets are read this many TMDB pages deep (20 films a page) for the scale. */
      setPages: 10,
      /** A genre and decade needs this many films above the floor, and a most-voted film with this many votes. */
      genreMinFilms: 60,
      genreTopVotes: 2500,
      /** A theme needs this many films above the floor. */
      themeMinFilms: 30,
      /** Decades a genre prompt can name, by first year. */
      decades: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020],
      /** Tries at one kind of prompt before giving up on it for the day. */
      attempts: 20,
    },
  },
} as const;
