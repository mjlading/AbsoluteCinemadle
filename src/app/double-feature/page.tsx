import type { Metadata } from "next";

import { DoubleFeatureGame } from "@/components/double-feature/DoubleFeatureGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Double Feature | Absolute Cinemadle",
  description: "Two films, one question: which is longer, cost more, made more, rated higher or came out first?",
};

/** Today's board, by the player's own calendar. */
export default function DoubleFeatureTodayPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DoubleFeatureGame />
      <SiteFooter />
    </div>
  );
}
