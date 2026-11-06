/** Facts about the site itself. */
export const SITE = {
  name: "Absolute Cinemadle",
  url: "https://absolutecinemadle.fun",
  games: {
    daily: "/daily",
    keywordCollage: "/keyword-collage",
    soundbytes: "/soundbytes",
  },
  /** Puzzle #1 is played on this date; numbers count up one per day from it. */
  launchDate: "2026-10-14",
} as const;
