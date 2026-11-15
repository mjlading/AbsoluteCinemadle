import type { Metadata } from "next";

import { SiteFooter } from "@/components/game/SiteFooter";
import { HowOldGame } from "@/components/how-old/HowOldGame";

export const metadata: Metadata = {
  title: "How Old Were They? | Absolute Cinemadle",
  description: "Five actors, five films: guess how old each actor was when the film came out.",
};

/** Today's board, by the player's own calendar. */
export default function HowOldTodayPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <HowOldGame />
      <SiteFooter />
    </div>
  );
}
