import type { Metadata } from "next";

import { CarbonDatingGame } from "@/components/carbon-dating/CarbonDatingGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Carbon Dating | Absolute Cinemadle",
  description: "Five film stills from five decades: date each one to its release year by its look.",
};

/** Today's board, by the player's own calendar. */
export default function CarbonDatingTodayPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <CarbonDatingGame />
      <SiteFooter />
    </div>
  );
}
