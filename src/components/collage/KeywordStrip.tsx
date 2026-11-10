"use client";

import type { KeyboardEvent, MouseEvent } from "react";

import type { CollageState } from "@/lib/collage/state";

export type SlotState = "current" | "spent" | "locked" | "won" | "unreached";

/** How one keyword's tape looks: played, playing, still to come, or (after a win) the winner and the ones never needed. */
export function slotState(index: number, round: number, status: CollageState["status"]): SlotState {
  if (status === "lost") return "spent";
  if (index < round) return "spent";
  if (index === round) return status === "won" ? "won" : "current";
  return status === "won" ? "unreached" : "locked";
}

export const tabId = (index: number) => `closeups-tab-${index}`;
export const PANEL_ID = "closeups-panel";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The keywords as tape labels; also the guess counter. A tab list: opened
 * keywords show their collage again, locked ones are disabled tabs that only wiggle.
 */
export function KeywordStrip({
  labels,
  round,
  status,
  view,
  onView,
  onLockedPress,
}: {
  labels: string[];
  round: number;
  status: CollageState["status"];
  view: number;
  onView: (index: number) => void;
  onLockedPress: () => void;
}) {
  const states = labels.map((_, i) => slotState(i, round, status));
  const viewable = states.flatMap((s, i) => (s === "locked" ? [] : [i]));

  const press = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    if (states[index] !== "locked") return onView(index);
    if (!reducedMotion()) {
      event.currentTarget.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-3px)" },
          { transform: "translateX(3px)" },
          { transform: "translateX(-2px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 320 },
      );
    }
    onLockedPress();
  };

  // Arrow keys, Home and End move between the opened keywords and show each one (automatic activation).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = viewable.indexOf(view);
    const moves: Record<string, number> = {
      ArrowRight: viewable[(at + 1) % viewable.length],
      ArrowLeft: viewable[(at - 1 + viewable.length) % viewable.length],
      Home: viewable[0],
      End: viewable[viewable.length - 1],
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    if (next !== view) onView(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div role="tablist" aria-label="Keywords" onKeyDown={onKeyDown} className="flex h-9 gap-1.5">
      {labels.map((label, i) => {
        const state = states[i];
        const selected = i === view;
        return (
          <button
            key={i}
            id={tabId(i)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={state === "locked" || undefined}
            aria-controls={PANEL_ID}
            tabIndex={selected ? 0 : -1}
            data-state={state}
            onClick={(event) => press(i, event)}
            className={`group relative min-w-0 flex-1 basis-0 rounded-[3px] focus-visible:outline-white ${
              state === "locked" ? "cursor-default" : "cursor-pointer"
            }`}
          >
            <span className="closeups-tape closeups-tape-label flex h-full items-center justify-center px-1 font-condensed font-extrabold uppercase leading-none tracking-[0.06em]">
              <span className="truncate">{label}</span>
            </span>
            {state === "spent" && <MarkerCross />}
            {selected && viewable.length > 1 && (
              <span
                aria-hidden="true"
                className="absolute inset-x-[30%] -bottom-[5px] h-[2px] rounded-full bg-lamp/70"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function MarkerCross() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="closeups-cross pointer-events-none absolute right-[3px] top-[2px] size-[10px] drop-shadow-[0_0_1px_rgb(0_0_0/0.6)]"
    >
      <path pathLength={1} d="M2.2 2.4 C4.5 4.8 7 7.2 9.8 9.6" />
      <path pathLength={1} d="M9.8 2.2 C7.4 4.6 5 7 2.2 9.8" />
    </svg>
  );
}
