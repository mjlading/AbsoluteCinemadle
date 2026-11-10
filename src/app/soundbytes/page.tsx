import type { Metadata } from "next";

import { SoundbytesGame } from "@/components/soundbytes/SoundbytesGame";
import { SoundbytesShell } from "@/components/soundbytes/SoundbytesShell";

export const metadata: Metadata = {
  title: "Soundbytes | Absolute Cinemadle",
  description: "Name the film by ear, from lines of its dialogue. A new film every day.",
};

/** Today's board, by the player's own calendar; played or not, this is where the game lives. */
export default function SoundbytesTodayPage() {
  return (
    <SoundbytesShell>
      <SoundbytesGame />
    </SoundbytesShell>
  );
}
