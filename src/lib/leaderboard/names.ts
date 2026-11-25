/** Leaderboard names: what a player may call themselves, and when two names are the same player. */

export const NAME_MAX = 20;

/** Letters (any script), digits, spaces and a few joiners; nothing that could pass for markup or a link. */
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N} '._-]*$/u;

/** The name to store and show: trimmed, inner runs of spaces collapsed, or null when it isn't allowed. */
export function tidyName(raw: string): string | null {
  const name = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > NAME_MAX || !ALLOWED.test(name)) return null;
  return name;
}

/** The form two names are compared in: case, accents and spacing don't make a new player. */
export const nameKey = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s'._-]+/g, "");
