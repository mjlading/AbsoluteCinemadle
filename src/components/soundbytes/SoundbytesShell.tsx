import type { ReactNode } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";

/**
 * One screen, top to bottom: the top bar and the board, then the footer line,
 * which credits the clips. Only very short screens (landscape phones) scroll.
 */
export function SoundbytesShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-[36rem] flex-col">
      {children}
      <SiteFooter compact credit="clips" />
    </div>
  );
}
