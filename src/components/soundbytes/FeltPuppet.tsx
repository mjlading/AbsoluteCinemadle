import type { CSSProperties } from "react";

/*
 * The talking character on dialogue nodes: a fuzzy felt sock puppet seen side
 * on, with a wild flame of hair, two big ping-pong eyes looking where it faces,
 * and a pom-pom or droopy felt nose on the end of its snout.
 * It talks like the clapperboard: the mouth is hinged at the back, so the head
 * tips up and the jaw swings down (the mouth is open to whatever is behind
 * it, like a sock puppet's), and the whole head snaps from side to side
 * with every new syllable. The same puppet plays every role, in one of three
 * colours, so it never looks like the real character and has no skin tone.
 *
 * soundbytes.css ("pp-") animates it from --sb-open and --sb-side, which the
 * clip player writes from the voice alone while its clip plays (see
 * use-clip-player.ts). `face` turns it toward the middle of the board.
 */

const FELTS = [
  { felt: "#8a5cd6", dark: "#6b40b8", nose: "#f2c641", hair: "#f26b1d", droop: false },
  { felt: "#2fa7a0", dark: "#1f8580", nose: "#f08a3c", hair: "#f2c641", droop: true },
  { felt: "#5b8f3a", dark: "#43722a", nose: "#e2579b", hair: "#f26b1d", droop: false },
] as const;

/** Which colour each board slot gets, so neighbouring puppets differ. */
const BY_SLOT = [0, 1, 2, 1, 2, 0];

const INK = "#181b21";

export function FeltPuppet({ slot, uid, face }: { slot: number; uid: string; face: "left" | "right" }) {
  const f = FELTS[BY_SLOT[slot] ?? 0];
  const fuzz = `sb-felt-${uid}`;
  const felt = `url(#${fuzz})`;
  const ball = `sb-eye-${uid}`;
  return (
    <svg className="sb-figure-art pp" viewBox="0 0 100 112" aria-hidden="true" data-face={face}>
      <defs>
        {/* Roughens every edge, so the felt looks fuzzy. */}
        <filter id={fuzz} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={(BY_SLOT[slot] ?? 0) + 3} />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        {/* Ping-pong balls: lit from the top left, shading to grey at the rim. */}
        <radialGradient id={ball} cx="0.38" cy="0.34" r="0.72">
          <stop offset="0.5" stopColor="#fff" />
          <stop offset="0.88" stopColor="#e3e6ea" />
          <stop offset="1" stopColor="#c3c8cf" />
        </radialGradient>
      </defs>
      {/* The sleeve the hand goes into: it stays put while the head snaps about on it. */}
      <path d="M16 112l7-36c6-8 22-9 30-1l6 37z" fill={f.dark} stroke={INK} strokeWidth="1.6" filter={felt} />
      <g className="pp-head">
        <g className="pp-jaw">
          <g filter={felt}>
            <path
              d="M26 64h66c3 1 3 5 1 8-8 14-30 20-48 16-12-3-19-12-19-24z"
              fill={f.dark}
              stroke={INK}
              strokeWidth="1.8"
            />
          </g>
          <path d="M40 64c12-6 34-6 46 0z" fill="#ef6a86" />
        </g>
        <g className="pp-upper">
          <g filter={felt}>
            {/* A flame of hair at the back of the head, sticking out every which way. */}
            <path
              d="M20 34c-9-3-13-10-11-16 3 4 7 6 11 6-3-6-2-13 3-16 0 6 3 10 7 11-1-7 3-13 9-14-2 6 0 10 4 12 2-6 7-9 12-9-3 4-3 9-1 13-8 4-19 9-34 13z"
              fill={f.hair}
              stroke={INK}
              strokeWidth="1.4"
            />
            <path
              d="M26 65C16 45 23 19 49 14c25-4 45 10 49 32 1 10-1 16-6 18z"
              fill={f.felt}
              stroke={INK}
              strokeWidth="1.8"
            />
          </g>
          {/* The far eye peeks over the near one; both look ahead, the way the puppet faces. */}
          <Eye x={73} y={18} r={12} ball={ball} />
          <Eye x={57} y={22} r={15} ball={ball} />
          {f.droop ? (
            <path
              d="M90 41c4-3 10-1 11 4 2 7 1 15-2 20-2 4-6 3-6-1 0-4 2-6 1-10-1-5-6-8-4-13z"
              fill={f.nose}
              stroke={INK}
              strokeWidth="1.6"
              filter={felt}
            />
          ) : (
            <>
              <circle cx="96" cy="47" r="7.5" fill={f.nose} stroke={INK} strokeWidth="1.6" filter={felt} />
              <circle cx="94" cy="44" r="2" fill="#fff" opacity="0.45" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}

/**
 * A big ping-pong eye with no lid. Its pupil sits toward the front of the ball, looking ahead and a little up,
 * with a catchlight; it darts with each syllable (see soundbytes.css).
 */
function Eye({ x, y, r, ball }: { x: number; y: number; r: number; ball: string }) {
  const px = x + r * 0.4;
  const py = y - r * 0.12;
  const pupil = r * 0.36;
  return (
    <g className="pp-eye" style={{ "--eye-x": `${x}px`, "--eye-y": `${y}px` } as CSSProperties}>
      <g className="pp-blink">
        <circle cx={x} cy={y} r={r} fill={`url(#${ball})`} stroke={INK} strokeWidth="2" />
        <g className="pp-pupil">
          <circle cx={px} cy={py} r={pupil} fill={INK} />
          <circle cx={px - pupil * 0.35} cy={py - pupil * 0.4} r={pupil * 0.3} fill="#fff" />
        </g>
      </g>
    </g>
  );
}
