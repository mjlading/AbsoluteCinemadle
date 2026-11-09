/** Facts about the site itself. */
export const SITE = {
  name: "Absolute Cinemadle",
  url: "https://absolutecinemadle.fun",
  games: {
    daily: "/daily",
    closeUps: "/close-ups",
    closeUpsArchive: "/close-ups/archive",
    soundbytes: "/soundbytes",
    castingCall: "/casting-call",
  },
  /** Puzzle #1 is played on this date; numbers count up one per day from it. */
  launchDate: "2026-10-14",
  /** Close-Ups #1 is played on this date; its numbers count up one per day from it. */
  closeUpsLaunchDate: "2026-11-10",
} as const;
