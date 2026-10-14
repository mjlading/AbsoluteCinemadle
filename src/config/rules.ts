/** Game rules that are not point values (those live in scoring.ts). */
export const RULES = {
  grid: {
    groupCount: 4,
    groupSize: 4,
    maxMistakes: 4,
    maxSoundHints: 2,
  },
  warmup: {
    titleCount: 5,
    timeLimitSeconds: 60,
  },
} as const;
