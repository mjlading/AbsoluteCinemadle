import type { Metadata } from "next";

import { CollageGame } from "@/components/collage/CollageGame";
import { GameShell } from "@/components/collage/GameShell";

export const metadata: Metadata = {
  title: "Close-Ups | Absolute Cinemadle",
  description: "Name the film from close-ups that share one detail. A new film every day.",
};

/** Today's puzzle, by the player's own calendar; played or not, this is where the game lives. */
export default function CloseUpsTodayPage() {
  return (
    <GameShell>
      <CollageGame />
    </GameShell>
  );
}
