/*
 * Forgiving title matching for the warm-up: case, accents, punctuation and a
 * leading article don't matter, and longer titles tolerate a typo or two.
 */

const LEADING_ARTICLE = /^(the|a|an) /;

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['\u2019`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(LEADING_ARTICLE, "");
}

/** Edits allowed for a title of this many characters: none for short ones, where one letter is often another film ("Alien", "Aliens"). */
const allowedEdits = (length: number) => (length >= 14 ? 2 : length >= 8 ? 1 : 0);

const NUMBER_TOKEN = /^(\d+|ii|iii|iv|v|vi|vii|viii|ix|x)$/;

/** Sequel numbers must agree exactly: "Toy Story 3" is never a typo of "Toy Story 2". */
const numbers = (normalized: string) =>
  normalized
    .split(" ")
    .filter((token) => NUMBER_TOKEN.test(token))
    .sort()
    .join(" ");

/** Optimal string alignment distance: insertions, deletions, substitutions and swaps of neighbours. */
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

export function titleMatches(guess: string, answers: readonly (string | null)[]): boolean {
  const normalizedGuess = normalizeTitle(guess);
  if (!normalizedGuess) return false;
  return answers.some((answer) => {
    if (!answer) return false;
    const normalizedAnswer = normalizeTitle(answer);
    if (numbers(normalizedGuess) !== numbers(normalizedAnswer)) return false;
    return editDistance(normalizedGuess, normalizedAnswer) <= allowedEdits(normalizedAnswer.length);
  });
}
