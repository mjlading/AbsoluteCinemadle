export interface NamesToBlank {
  titles: string[];
  actors: string[];
  characters: string[];
  directors: string[];
}

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "");
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every way a name may appear: the full name, plus single surnames and
 * single-word character names long enough not to be common words.
 */
function variants(names: string[], { parts }: { parts: "last" | "all" | "none" }): string[] {
  const out = new Set<string>();
  for (const name of names) {
    const clean = name.trim();
    if (!clean) continue;
    out.add(clean);
    const words = clean.split(/\s+/);
    if (words.length > 1 && parts !== "none") {
      const picks = parts === "last" ? [words.at(-1)!] : words;
      for (const word of picks) if (word.replace(/\W/g, "").length >= 4) out.add(word);
    }
  }
  // Longest first, so "Harrison Ford" is replaced before "Ford".
  return [...out].sort((a, b) => b.length - a.length);
}

const boundaryPattern = (name: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, "giu");

/** Replaces whole-word matches of `name`, ignoring case and accents, keeping the rest of `text` as written. */
function replaceName(text: string, name: string, placeholder: string): string {
  const folded = fold(text);
  // Folding can change the length (ligatures and the like); then indexes no longer line up.
  if (folded.length !== text.length) return text.replace(boundaryPattern(name), placeholder);
  let out = "";
  let last = 0;
  for (const match of folded.matchAll(boundaryPattern(fold(name)))) {
    out += text.slice(last, match.index) + placeholder;
    last = match.index + match[0].length;
  }
  return out + text.slice(last);
}

/**
 * Replaces film titles and people's names in a review excerpt with neutral
 * placeholders, so the hint points at the film without naming it.
 */
export function blankNames(text: string, names: NamesToBlank): string {
  const rules: [string[], string][] = [
    [variants(names.titles, { parts: "none" }), "[film]"],
    [variants(names.directors, { parts: "last" }), "[director]"],
    [variants(names.actors, { parts: "last" }), "[actor]"],
    [variants(names.characters, { parts: "all" }), "[character]"],
  ];
  let result = text;
  for (const [list, placeholder] of rules) {
    for (const name of list) result = replaceName(result, name, placeholder);
  }
  return result;
}
