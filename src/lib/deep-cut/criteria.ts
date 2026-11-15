import { z } from "zod";

import { RULES } from "@/config/rules";
import { ANIMATION_GENRE, DOCUMENTARY_GENRE, TV_MOVIE_GENRE } from "./themes";
import { fameForScore } from "./rarity";
import type { Misfit } from "./types";

/*
 * What a prompt asks for, and whether a film fits it, judged from the film's own
 * TMDB record. The board builds each prompt's set of fitting films from TMDB's
 * lists by the same criterion, but a player's film is always checked here, so a
 * film that fits but wasn't in the set still counts.
 */

const B = RULES.deepCut.board;

export const CriterionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("actor"), personId: z.number().int().positive() }),
  z.object({ kind: z.literal("director"), personId: z.number().int().positive() }),
  z.object({
    kind: z.literal("genreDecade"),
    genreId: z.number().int().positive(),
    from: z.number().int(),
    to: z.number().int(),
  }),
  z.object({ kind: z.literal("theme"), keywordIds: z.array(z.number().int().positive()).min(1) }),
]);
export type Criterion = z.infer<typeof CriterionSchema>;
export type PromptKind = Criterion["kind"];
export const PROMPT_KINDS: readonly PromptKind[] = ["actor", "director", "genreDecade", "theme"];

/** Names a criterion, so the same person, theme or genre and decade can be kept off nearby boards. */
export function criterionKey(c: Criterion): string {
  switch (c.kind) {
    case "actor":
    case "director":
      return `person:${c.personId}`;
    case "genreDecade":
      return `genre:${c.genreId}:${c.from}`;
    case "theme":
      return `theme:${[...c.keywordIds].sort((a, b) => a - b).join(",")}`;
  }
}

/** What the check needs from a film's TMDB record. */
export interface FilmRecord {
  tmdbId: number;
  title: string;
  year: number | null;
  voteCount: number;
  /** Minutes; 0 when TMDB doesn't know. */
  runtime: number;
  genreIds: number[];
  keywordIds: number[];
  cast: { personId: number; character: string }[];
  crew: { personId: number; job: string }[];
}

/** A credit for playing oneself (a cameo as a celebrity, an interview) rather than a role. */
export const isSelfCredit = (character: string) => /\b(self|himself|herself|themselves)\b/i.test(character);
export const isArchiveCredit = (character: string) => /archive footage/i.test(character);

/** An acting role: not oneself, not archive footage. Voice roles and uncredited parts count. */
export const isActingCredit = (character: string) => !isSelfCredit(character) && !isArchiveCredit(character);

/** Whether a film fits a prompt, or why not. Documentaries and shorts never fit. */
export function checkFit(criterion: Criterion, film: FilmRecord): { fits: true } | { fits: false; why: Misfit } {
  if (film.genreIds.includes(DOCUMENTARY_GENRE)) return { fits: false, why: "documentary" };
  if (film.runtime > 0 && film.runtime < B.minRuntime) return { fits: false, why: "short" };
  const fits = (() => {
    switch (criterion.kind) {
      case "actor":
        return film.cast.some((c) => c.personId === criterion.personId && isActingCredit(c.character));
      case "director":
        return film.crew.some((c) => c.personId === criterion.personId && c.job === "Director");
      case "genreDecade":
        return (
          film.genreIds.includes(criterion.genreId) &&
          film.year !== null &&
          film.year >= criterion.from &&
          film.year <= criterion.to
        );
      case "theme":
        return film.keywordIds.some((k) => criterion.keywordIds.includes(k));
    }
  })();
  return fits ? { fits: true } : { fits: false, why: "no" };
}

/** A fitting film the board knows of, from a person's credits or a TMDB list. */
export interface Candidate {
  tmdbId: number;
  title: string;
  year: number | null;
  voteCount: number;
  voteAverage: number;
  genreIds: number[];
  /** Billing order for an actor's films (from 0); absent otherwise. */
  order?: number;
}

/**
 * The deep-cut examples to try, best first: fitting films with at least the deep cut's
 * minimum votes that score at least its minimum, best rated first; then the least known
 * above that range and the best known below it, so there is always one when the set allows.
 * Animation and TV films are left out unless the prompt is about animation, an actor's
 * must be a billed part, and none may be newer than `latestYear`.
 */
export function deepCutCandidates(
  films: readonly Candidate[],
  opts: { allowAnimation: boolean; top: number; latestYear: number },
) {
  const { minVotes, minScore } = B.deepCut;
  const maxVotes = fameForScore(minScore, opts.top);
  const usable = films.filter(
    (f) =>
      f.voteCount < opts.top &&
      f.voteCount >= B.voteFloor &&
      f.year !== null &&
      f.year <= opts.latestYear &&
      !f.genreIds.includes(TV_MOVIE_GENRE) &&
      !f.genreIds.includes(DOCUMENTARY_GENRE) &&
      (opts.allowAnimation || !f.genreIds.includes(ANIMATION_GENRE)) &&
      (f.order === undefined || f.order <= B.deepCutBillingOrder),
  );
  const seen = new Set<number>();
  const unique = usable.filter((f) => !seen.has(f.tmdbId) && Boolean(seen.add(f.tmdbId)));
  const inRange = unique
    .filter((f) => f.voteCount >= minVotes && f.voteCount <= maxVotes)
    .sort((a, b) => b.voteAverage - a.voteAverage || a.voteCount - b.voteCount);
  const above = unique.filter((f) => f.voteCount > maxVotes).sort((a, b) => a.voteCount - b.voteCount);
  const below = unique.filter((f) => f.voteCount < minVotes).sort((a, b) => b.voteCount - a.voteCount);
  return [...inRange, ...above, ...below];
}
