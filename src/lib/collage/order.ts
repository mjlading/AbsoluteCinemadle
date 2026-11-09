import { RULES } from "@/config/rules";
import { COLLAGE_TIERS, type CollageKeyword } from "./types";

/*
 * The order Close-Ups opens its keywords in: the free starter first, then the
 * vaguest (hard) to the most telling (easy), stable within a tier, and only as
 * many as a puzzle uses. Keywords past the cut are dropped, so their pictures
 * are never served.
 */
export function revealOrder(keywords: CollageKeyword[]): CollageKeyword[] {
  const rank = (k: CollageKeyword) => (k.free ? -1 : COLLAGE_TIERS.indexOf(k.tier));
  return keywords
    .map((k, index) => ({ k, index }))
    .sort((a, b) => rank(a.k) - rank(b.k) || a.index - b.index)
    .map(({ k }) => k)
    .slice(0, RULES.closeUps.keywordsPerPuzzle);
}
