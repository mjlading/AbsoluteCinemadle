/*
 * The five comparisons Double Feature asks about, and how their values read.
 * Shared by the server (building boards, revealing) and the client (asking).
 */

export const QUESTION_KINDS = ["runtime", "budget", "revenue", "rating", "release"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const QUESTIONS: Record<QuestionKind, { ask: string; smallPrint: string | null }> = {
  runtime: { ask: "Which is longer?", smallPrint: "Running time as TMDB lists it." },
  budget: {
    ask: "Which cost more to make?",
    smallPrint: "Budgets as TMDB reports them, in the dollars of the day: not adjusted for inflation.",
  },
  revenue: {
    ask: "Which made more at the box office?",
    smallPrint: "Worldwide box office as TMDB reports it, in the dollars of the day: not adjusted for inflation.",
  },
  rating: { ask: "Which is rated higher?", smallPrint: "TMDB users' average rating, out of 10." },
  release: { ask: "Which came out first?", smallPrint: null },
};

/** "Came out first" rounds hide the years, which would give the answer away. */
export const showsYear = (kind: QuestionKind) => kind !== "release";

/** "2h 22m", "58m", "2h". */
export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "$63 million", "$6.5 million", "$1.2 billion". */
export function formatMoney(dollars: number): string {
  if (dollars >= 1e9) return `$${trim((dollars / 1e9).toFixed(dollars >= 1e10 ? 1 : 2))} billion`;
  const millions = dollars / 1e6;
  return `$${millions >= 10 ? Math.round(millions) : trim(millions.toFixed(1))} million`;
}

const trim = (fixed: string) => fixed.replace(/\.?0+$/, "");

/** A value as the reveal shows it. Release values are the year; ratings are already rounded to 0.1. */
export function formatValue(kind: QuestionKind, value: number): string {
  switch (kind) {
    case "runtime":
      return formatRuntime(value);
    case "budget":
    case "revenue":
      return formatMoney(value);
    case "rating":
      return value.toFixed(1);
    case "release":
      return String(value);
  }
}
