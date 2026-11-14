import type { Metadata } from "next";

import { CastingCallGame } from "@/components/casting-call/CastingCallGame";
import { CastingCallShell } from "@/components/casting-call/CastingCallShell";

export const metadata: Metadata = {
  title: "Casting call | Absolute Cinemadle",
  description: "Eight actors' faces: name films they're in and cross them all out. A new board every day.",
};

/** Today's board, by the player's own calendar; played or not, this is where the game lives. */
export default function CastingCallTodayPage() {
  return (
    <CastingCallShell>
      <CastingCallGame />
    </CastingCallShell>
  );
}
