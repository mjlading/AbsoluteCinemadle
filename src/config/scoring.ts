/**
 * Every point value in the game.
 * Nothing else may hardcode a score; import from here instead.
 */
export const POINTS = {
  closeUps: {
    /** Points for a win on the first clue's keyword, before the bonus. */
    start: 4,
    /** Each earlier miss or skip costs this much. */
    perMissOrSkip: -1,
    /** Extra points for a win on the very first guess. */
    firstClueBonus: 2,
  },
  /** Prototype: guess a still's release year. */
  carbonDating: {
    /** Points for the exact year. */
    exact: 100,
    /** Each year off costs this much, down to 0. */
    perYearOff: -8,
  },
  /** Prototype: guess an actor's age when a film came out. */
  howOld: {
    /** Points for the exact age. */
    exact: 100,
    /** Each year off costs this much, down to 0. */
    perYearOff: -12,
  },
  /** Prototype: pick the film that wins the round's comparison. */
  doubleFeature: {
    /** Points for each round where the player picked the film that wins. */
    perCorrect: 1,
  },
  /** Prototype: name the series from its episode ratings. */
  ratingsCliff: {
    perCorrect: 1,
  },
  /** Prototype: name a fitting film few would think of. */
  deepCut: {
    /** Points for the rarest fitting answer; the most obvious one scores 0. */
    max: 100,
    /**
     * Points follow an answer's place on a log scale of fame (0 at the most obvious answer, 1 at the
     * vote floor) raised to this power: below 1 it lifts the middle, so a solid second-tier answer
     * (Hook for "a film with pirates") earns about a third and a real deep cut 80 or more.
     */
    curve: 0.75,
  },
} as const;
