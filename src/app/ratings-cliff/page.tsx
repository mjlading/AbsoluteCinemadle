import type { Metadata } from "next";

import { SiteFooter } from "@/components/game/SiteFooter";
import { RatingsCliffGame } from "@/components/ratings-cliff/RatingsCliffGame";

export const metadata: Metadata = {
  title: "Ratings Cliff | Absolute Cinemadle",
  description: "Five TV series, each shown only as a chart of its episodes' ratings: name the show.",
};

/** Today's board, by the player's own calendar. */
export default function RatingsCliffTodayPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <RatingsCliffGame />
      <SiteFooter />
    </div>
  );
}
