import type { CSSProperties } from "react";

import type { Disguise } from "@/lib/soundbytes/types";
import { PriceChip } from "./icons";

/** idle: attached; enter: just bought, arriving; exit: the hold finished, leaving. */
export type DisguiseMode = "idle" | "enter" | "exit";

/**
 * The object a disguised node wears, with the price of removing it on top.
 * Balloons and kazoos sit in the slot's attach direction; the door covers the
 * record itself. Holding the node animates it (see soundbytes.css): the
 * balloon inflates, the kazoo slides out, the door creaks open.
 */
export function DisguiseObject({
  disguise,
  attach,
  cost,
  mode,
}: {
  disguise: Disguise;
  attach: number;
  cost: number | null;
  mode: DisguiseMode;
}) {
  const chip = cost !== null && mode !== "exit" ? <PriceChip cost={cost} className="sb-object-chip" /> : null;

  if (disguise === "muffle") {
    return (
      <span className="sb-door-frame" data-mode={mode}>
        <span className="sb-door">
          <Door />
          {chip}
        </span>
      </span>
    );
  }

  const style = { "--attach": `${attach}deg` } as CSSProperties;
  if (disguise === "helium") {
    return (
      <span className="sb-attach" style={style} data-mode={mode}>
        <span className="sb-string" />
        <span className="sb-balloon">
          <span className="sb-balloon-body">
            <Balloon />
            {chip}
          </span>
        </span>
        {mode === "exit" && <PopBurst />}
      </span>
    );
  }
  return (
    <span className="sb-attach" style={style} data-mode={mode}>
      <span className="sb-kazoo">
        <span className="sb-kazoo-body">
          <Kazoo />
          {chip}
        </span>
      </span>
    </span>
  );
}

/** Gradients shared by every balloon and kazoo, rendered once per board so ids stay unique. */
export function DisguiseDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <radialGradient id="sb-balloon-shade" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#5a0610" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id="sb-kazoo-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#8d949e" />
          <stop offset="0.35" stopColor="#f1f3f5" />
          <stop offset="0.6" stopColor="#c3c9d0" />
          <stop offset="1" stopColor="#6f7680" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Balloon() {
  return (
    <svg viewBox="0 0 40 52" className="sb-balloon-svg" aria-hidden="true">
      <path
        d="M20 2C9.5 2 3 10.4 3 20.3 3 31.9 12.4 41 18.3 43.6h3.4C27.6 41 37 31.9 37 20.3 37 10.4 30.5 2 20 2z"
        fill="#e23b4b"
      />
      <path
        d="M20 2C9.5 2 3 10.4 3 20.3 3 31.9 12.4 41 18.3 43.6h3.4C27.6 41 37 31.9 37 20.3 37 10.4 30.5 2 20 2z"
        fill="url(#sb-balloon-shade)"
      />
      <path d="M17.2 43.4l2.8 3.6 2.8-3.6z" fill="#b8202f" />
      <ellipse cx="12.5" cy="13" rx="3.2" ry="5.6" transform="rotate(28 12.5 13)" fill="#fff" opacity="0.45" />
    </svg>
  );
}

/** Shreds of rubber flying out when the balloon pops. */
function PopBurst() {
  return (
    <span className="sb-pop" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </span>
  );
}

/** Drawn pointing up: the mouthpiece end is at the bottom, buried in the record. */
function Kazoo() {
  return (
    <svg viewBox="0 0 30 64" className="sb-kazoo-svg" aria-hidden="true">
      <path
        d="M5 61.5c0 1 .8 1.5 2 1.5h11c1.2 0 2-.5 2-1.5L17.6 7.5C17.4 4.6 16 3 13.8 3h-2.6C9 3 7.6 4.6 7.4 7.5z"
        fill="url(#sb-kazoo-metal)"
        stroke="#3f454d"
        strokeWidth="1"
      />
      <ellipse cx="12.5" cy="5.2" rx="3.4" ry="1.3" fill="#2a2e35" />
      <rect x="18.2" y="25" width="6.6" height="13" rx="2" fill="#d92b3f" stroke="#7d1220" strokeWidth="1" />
      <rect
        x="23.6"
        y="23.6"
        width="3.6"
        height="15.8"
        rx="1.6"
        fill="url(#sb-kazoo-metal)"
        stroke="#3f454d"
        strokeWidth="0.9"
      />
      <path d="M8.6 12v44" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function Door() {
  return (
    <svg viewBox="0 0 40 50" className="sb-door-svg" aria-hidden="true" preserveAspectRatio="none">
      <path d="M2 49V18C2 8.6 10 2 20 2s18 6.6 18 16v31z" fill="#8a5a34" stroke="#3d2614" strokeWidth="1.6" />
      <path d="M11.5 4.8V49M20 2v47M28.5 4.8V49" stroke="#6e4526" strokeWidth="1.2" />
      <path d="M2 21h36M2 39h36" stroke="#3d2614" strokeWidth="1.4" opacity="0.6" />
      <circle cx="31.5" cy="30" r="2.3" fill="#e9b83a" stroke="#6e4c0c" strokeWidth="0.8" />
    </svg>
  );
}
