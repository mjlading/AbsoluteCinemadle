import type { ReactNode } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";

/**
 * One screen, top to bottom: the game's top bar and stage, then the footer
 * line. Only very short screens (landscape phones) scroll.
 */
export function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-[36rem] flex-col">
      {children}
      <SiteFooter compact />
    </div>
  );
}
