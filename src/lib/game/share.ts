import { SITE } from "@/config/site";
import type { Tier } from "@/lib/puzzle/types";

const TIER_EMOJI: Record<Tier, string> = { 1: "🟦", 2: "🟨", 3: "🟪", 4: "⬜" };

export interface ShareInput {
  date: string;
  total: number;
  /** One entry per warm-up card, in play order: found or not. */
  warmup: boolean[];
  /** Every grid guess as the tiers of its four tiles, in order. */
  gridGuesses: Tier[][];
  /** One entry per barcode: matched or not. Empty if the bonus wasn't checked. */
  bonus: boolean[];
  hints: { flips: number; sound: number; review: number };
}

const utcDay = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

/** Puzzle numbers count days from the launch, #1 on launch day. */
export function puzzleNumber(date: string): number {
  return utcDay(date) - utcDay(SITE.launchDate) + 1;
}

/** The spoiler-free summary players paste into chats: colours and counts, never titles. */
export function shareText(input: ShareInput): string {
  const lines = [`${SITE.name} #${puzzleNumber(input.date)}: ${input.total} points`];
  if (input.warmup.length > 0) lines.push(`Warm-up ${input.warmup.map((f) => (f ? "🟩" : "⬛")).join("")}`);
  lines.push(...input.gridGuesses.map((row) => row.map((tier) => TIER_EMOJI[tier]).join("")));
  if (input.bonus.length > 0) lines.push(`Bonus ${input.bonus.map((m) => (m ? "🟩" : "🟥")).join("")}`);
  const hints = "🔊".repeat(input.hints.sound) + "💬".repeat(input.hints.review) + "🏷️".repeat(input.hints.flips);
  if (hints) lines.push(`Hints ${hints}`);
  lines.push(`${SITE.url}${SITE.games.daily}`.replace(/^https:\/\//, ""));
  return lines.join("\n");
}
