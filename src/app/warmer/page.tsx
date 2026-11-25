import type { Metadata } from "next";

import { DailyShell } from "@/components/game/DailyShell";
import { WarmerGame } from "@/components/warmer/WarmerGame";

export const metadata: Metadata = {
  title: "Warmer | Absolute Cinemadle",
  description: "Find the hidden film: every guess shows how close you are.",
};

/** Today's hidden film by the player's own calendar, or an earlier day's with `?date=`. */
export default function WarmerPage() {
  return (
    <DailyShell>
      <WarmerGame />
    </DailyShell>
  );
}
