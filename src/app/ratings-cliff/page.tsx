import type { Metadata } from "next";

import { DailyShell } from "@/components/game/DailyShell";
import { RatingsCliffGame } from "@/components/ratings-cliff/RatingsCliffGame";

export const metadata: Metadata = {
  title: "Ratings Cliff | Absolute Cinemadle",
  description: "Five TV series, each shown only as a grid of its episodes' ratings: name the show. New every day.",
};

/** Today's board, by the player's own calendar; played or not, this is where the game lives. */
export default function RatingsCliffTodayPage() {
  return (
    <DailyShell>
      <RatingsCliffGame />
    </DailyShell>
  );
}
