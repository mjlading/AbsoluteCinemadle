import { MOUTH_FPS, type Clip } from "./types";

/*
 * How the talking characters move: the mouth snaps between shut, half open
 * and wide open with the voice, like a puppeteer's hand, never easing in
 * between, and the head swings to the other side on every new syllable, as
 * far as the voice is loud: `sway` eases toward the loudness, so quiet lines
 * barely rock the head and loud ones swing it right over.
 */

/** A made-up speech rhythm, for clips without a mouth track: syllables in bursts, with pauses. */
function rhythm(t: number): number {
  if (t % 3.4 > 2.6) return 0;
  return (0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 3.1)) ** 0.7) * (0.75 + 0.25 * Math.sin(t * 1.7));
}

/** How loud the voice is at a moment of the clip, 0 to 1: from its mouth track, or the made-up rhythm. */
export function voiceAt(clip: Clip, t: number): number {
  if (!clip.mouth) return rhythm(t);
  return Number(clip.mouth[Math.floor(t * MOUTH_FPS)] ?? 0) / 9;
}

/** Shut, half open or wide open. */
export const openFor = (voice: number) => (voice >= 0.6 ? 1 : voice >= 0.25 ? 0.5 : 0);

/** A new syllable within this long of the last flip keeps the head where it is, so fast speech doesn't jitter. */
export const MIN_FLIP_S = 0.14;

/** How quickly `sway` follows the loudness: about two thirds of the way there in this many seconds. */
export const SWAY_S = 0.15;

export interface Mouth {
  open: number;
  side: 1 | -1;
  /** How far the head swings, 0 to 1: the voice's loudness, eased so it rises and falls smoothly. */
  sway: number;
  /** Seconds into the clip of the last flip. */
  flippedAt: number;
  /** Seconds into the clip of this pose. */
  t: number;
}

export const REST: Mouth = { open: 0, side: 1, sway: 0, flippedAt: -Infinity, t: 0 };

/** The pose at time `t` for a voice this loud, given the pose before it. */
export function nextMouth(prev: Mouth, voice: number, t: number): Mouth {
  const open = openFor(voice);
  // Frame-rate independent easing: the same feel at 30 or 120 frames a second.
  const ease = 1 - Math.exp(-Math.max(0, t - prev.t) / SWAY_S);
  const sway = prev.sway + (voice - prev.sway) * ease;
  const newSyllable = prev.open === 0 && open > 0 && t - prev.flippedAt >= MIN_FLIP_S;
  return newSyllable ? { open, side: prev.side === 1 ? -1 : 1, sway, flippedAt: t, t } : { ...prev, open, sway, t };
}
