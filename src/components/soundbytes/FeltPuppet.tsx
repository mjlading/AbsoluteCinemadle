import type { CSSProperties } from "react";

/*
 * The talking character on dialogue nodes: a felt hand puppet with ping-pong
 * eyes and a pom-pom nose. It speaks with two pieces, like a hand puppet: when
 * the mouth opens, the top of its head lifts and tips back while the jaw
 * drops; it tilts and leans in on loud words, and glances around when idle.
 * The same puppet plays every role, in one of three colours, so it never looks
 * like the real character and has no skin tone.
 *
 * soundbytes.css ("pp-") animates it from --sb-level and --sb-time, which the
 * clip player writes while its clip plays (see use-clip-player.ts).
 */

const FELTS = [
  { felt: "#8a5cd6", dark: "#6b40b8", nose: "#f2c641" },
  { felt: "#2fa7a0", dark: "#1f8580", nose: "#e2579b" },
  { felt: "#5b8f3a", dark: "#43722a", nose: "#f08a3c" },
] as const;

/** Which colour each board slot gets, so neighbouring puppets differ. */
const BY_SLOT = [0, 1, 2, 1, 2, 0];

const MOUTH_Y = 62;

export function FeltPuppet({ slot, uid }: { slot: number; uid: string }) {
  const f = FELTS[BY_SLOT[slot] ?? 0];
  const fuzz = `sb-felt-${uid}`;
  return (
    <svg
      className="sb-figure-art pp"
      viewBox="0 0 100 112"
      aria-hidden="true"
      style={{ "--mouth-y": `${MOUTH_Y}px` } as CSSProperties}
    >
      <defs>
        {/* Roughens every edge, so the felt looks fuzzy. */}
        <filter id={fuzz} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={(BY_SLOT[slot] ?? 0) + 3} />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
      </defs>
      <g className="pp-head">
        <g>
          <path d="M14 61h72c0 12-12 26-36 26S14 73 14 61z" fill="#3b1020" />
          <ellipse cx="50" cy="78" rx="14" ry="6" fill="#ef6a86" />
        </g>
        <g className="pp-jaw" filter={`url(#${fuzz})`}>
          <path d="M12 62h76c1 22-16 36-38 36S11 84 12 62z" fill={f.dark} stroke="#181b21" strokeWidth="1.8" />
          <path d="M24 98c8 6 44 6 52 0v8H24z" fill={f.felt} stroke="#181b21" strokeWidth="1.6" />
        </g>
        <g className="pp-upper">
          <g filter={`url(#${fuzz})`}>
            <path d="M44 8c-2-6 3-9 6-4 2-6 9-4 7 2 5-2 8 3 3 6" fill={f.dark} stroke="#181b21" strokeWidth="1.4" />
            <path
              d="M10 60C8 30 26 10 50 10s42 20 40 50c-12 4-28 5-40 5S22 64 10 60z"
              fill={f.felt}
              stroke="#181b21"
              strokeWidth="1.8"
            />
          </g>
          <Eye x={37} y={24} r={12} pupil={4.6} lid={f.dark} />
          <Eye x={63} y={23} r={11} pupil={4.1} lid={f.dark} />
          <circle cx="50" cy="44" r="7.5" fill={f.nose} stroke="#181b21" strokeWidth="1.6" filter={`url(#${fuzz})`} />
          <circle cx="47.5" cy="41.5" r="2" fill="#fff" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
}

/** A ping-pong eye whose pupil glances and jiggles, with a felt lid over its top third. */
function Eye({ x, y, r, pupil, lid }: { x: number; y: number; r: number; pupil: number; lid: string }) {
  const chord = y - r * 0.35;
  return (
    <g className="pp-blink" style={{ "--eye-x": `${x}px`, "--eye-y": `${y}px` } as CSSProperties}>
      <circle cx={x} cy={y} r={r} fill="#fff" stroke="#181b21" strokeWidth="2" />
      <g className="pp-pupil">
        <circle cx={x + 0.6} cy={y + 0.8} r={pupil} fill="#181b21" />
        <circle cx={x + 1.6} cy={y - 0.6} r={pupil * 0.32} fill="#fff" />
      </g>
      <path
        d={`M${x - r * 0.94 - 0.4} ${chord}A${r + 0.4} ${r + 0.4} 0 0 1 ${x + r * 0.94 + 0.4} ${chord}z`}
        fill={lid}
        stroke="#181b21"
        strokeWidth="1.6"
      />
    </g>
  );
}
