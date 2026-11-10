/** Facts about the site itself. */
export const SITE = {
  name: "Absolute Cinemadle",
  url: "https://absolutecinemadle.fun",
  /** Questions and takedown requests: an ImprovMX alias forwarding to the owner's inbox, so no private address is published. */
  contact: "contact@absolutecinemadle.fun",
  games: {
    closeUps: "/close-ups",
    closeUpsArchive: "/close-ups/archive",
    soundbytes: "/soundbytes",
    soundbytesArchive: "/soundbytes/archive",
    castingCall: "/casting-call",
  },
  /** Close-Ups #1 is played on this date; its numbers count up one per day from it. */
  closeUpsLaunchDate: "2026-11-10",
  /** Soundbytes #1 is played on this date; its numbers count up one per day from it. */
  soundbytesLaunchDate: "2026-11-10",
} as const;
