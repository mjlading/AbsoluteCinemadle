import type { Metadata } from "next";

import { DeepCutGame } from "@/components/deep-cut/DeepCutGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Deep Cut | Absolute Cinemadle",
  description:
    "Three prompts, many right answers: name a film that fits, and the less obvious it is, the more it scores.",
};

/** Today's prompts, by the player's own calendar. */
export default function DeepCutTodayPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DeepCutGame />
      <SiteFooter />
    </div>
  );
}
