import { RULES } from "@/config/rules";
import { COLLAGE_TIERS, type CollageKeyword } from "./types";

/*
 * The order Close-Ups opens its keywords in: the free starter first, then the
 * vaguest (hard) to the most telling (easy), stable within a tier. A puzzle with
 * more keywords than the game uses loses them from the middle, so the most
 * telling keyword always stays last. Dropped keywords' pictures are never served.
 */
export function revealOrder(keywords: CollageKeyword[]): CollageKeyword[] {
  const rank = (k: CollageKeyword) => (k.free ? -1 : COLLAGE_TIERS.indexOf(k.tier));
  const sorted = keywords
    .map((k, index) => ({ k, index }))
    .sort((a, b) => rank(a.k) - rank(b.k) || a.index - b.index)
    .map(({ k }) => k);
  const keep = RULES.closeUps.keywordsPerPuzzle;
  return sorted.length <= keep ? sorted : [...sorted.slice(0, keep - 1), sorted[sorted.length - 1]];
}
