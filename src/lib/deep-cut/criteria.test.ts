import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";
import { checkFit, criterionKey, deepCutCandidates, PROMPT_KINDS, type Candidate, type FilmRecord } from "./criteria";
import { pickKinds } from "./pick";

const film = (over: Partial<FilmRecord> = {}): FilmRecord => ({
  tmdbId: 1,
  title: "A Film",
  year: 1985,
  voteCount: 1000,
  runtime: 110,
  genreIds: [27],
  keywordIds: [10051],
  cast: [{ personId: 31, character: "Josh" }],
  crew: [{ personId: 578, job: "Director" }],
  ...over,
});

describe("checkFit", () => {
  it("takes an acting role, voice parts included, but not playing oneself or archive footage", () => {
    const actor = { kind: "actor", personId: 31 } as const;
    expect(checkFit(actor, film()).fits).toBe(true);
    expect(checkFit(actor, film({ cast: [{ personId: 31, character: "Woody (voice)" }] })).fits).toBe(true);
    expect(checkFit(actor, film({ cast: [{ personId: 31, character: "Self" }] })).fits).toBe(false);
    expect(checkFit(actor, film({ cast: [{ personId: 31, character: "Himself" }] })).fits).toBe(false);
    expect(checkFit(actor, film({ cast: [{ personId: 31, character: "Woody (archive footage)" }] })).fits).toBe(false);
    expect(checkFit(actor, film({ cast: [{ personId: 2, character: "Josh" }] })).fits).toBe(false);
  });

  it("takes only the Director job for a director", () => {
    const director = { kind: "director", personId: 578 } as const;
    expect(checkFit(director, film()).fits).toBe(true);
    expect(checkFit(director, film({ crew: [{ personId: 578, job: "Producer" }] })).fits).toBe(false);
  });

  it("checks genre and year for a genre and decade", () => {
    const horror80s = { kind: "genreDecade", genreId: 27, from: 1980, to: 1989 } as const;
    expect(checkFit(horror80s, film()).fits).toBe(true);
    expect(checkFit(horror80s, film({ year: 1990 })).fits).toBe(false);
    expect(checkFit(horror80s, film({ year: null })).fits).toBe(false);
    expect(checkFit(horror80s, film({ genreIds: [35] })).fits).toBe(false);
  });

  it("takes any of a theme's keywords", () => {
    expect(checkFit({ kind: "theme", keywordIds: [14544, 679] }, film({ keywordIds: [679] })).fits).toBe(true);
    expect(checkFit({ kind: "theme", keywordIds: [14544] }, film({ keywordIds: [679] })).fits).toBe(false);
  });

  it("never takes documentaries or shorts, and says which", () => {
    const actor = { kind: "actor", personId: 31 } as const;
    expect(checkFit(actor, film({ genreIds: [99] }))).toEqual({ fits: false, why: "documentary" });
    expect(checkFit(actor, film({ runtime: 22 }))).toEqual({ fits: false, why: "short" });
    expect(checkFit(actor, film({ runtime: 0 })).fits).toBe(true);
    expect(checkFit(actor, film({ cast: [] }))).toEqual({ fits: false, why: "no" });
  });
});

describe("deepCutCandidates", () => {
  const c = (tmdbId: number, voteCount: number, voteAverage = 7, over: Partial<Candidate> = {}): Candidate => ({
    tmdbId,
    title: `Film ${tmdbId}`,
    year: 1990,
    voteCount,
    voteAverage,
    genreIds: [18],
    ...over,
  });
  const opts = { allowAnimation: false, top: 30_000, latestYear: 2023 };

  it("prefers the best rated of the little-known films that aren't junk", () => {
    const films = [c(1, 30_000), c(2, 400, 6.1), c(3, 600, 7.8), c(4, 120, 9), c(5, 9_000)];
    expect(deepCutCandidates(films, opts).map((f) => f.tmdbId)).toEqual([3, 2, 5, 4]);
  });

  it("leaves out animation, TV films, new films, bit parts and the most obvious answer", () => {
    const films = [
      c(1, 30_000),
      c(2, 500, 8, { genreIds: [16] }),
      c(3, 500, 8, { genreIds: [10770] }),
      c(4, 500, 8, { year: 2025 }),
      c(5, 500, 8, { order: RULES.deepCut.board.deepCutBillingOrder + 1 }),
      c(6, 500, 6),
    ];
    expect(deepCutCandidates(films, opts).map((f) => f.tmdbId)).toEqual([6]);
    expect(deepCutCandidates(films, { ...opts, allowAnimation: true }).map((f) => f.tmdbId)).toEqual([2, 6]);
  });

  it("lists a film once", () => {
    expect(deepCutCandidates([c(2, 500), c(2, 500)], opts)).toHaveLength(1);
  });
});

describe("board picking", () => {
  it("picks different kinds, the same for the same seed", () => {
    const a = pickKinds(PROMPT_KINDS, 3, seededRandom("x"));
    expect(new Set(a).size).toBe(3);
    expect(pickKinds(PROMPT_KINDS, 3, seededRandom("x"))).toEqual(a);
  });

  it("names criteria so a person is one key whether acting or directing", () => {
    expect(criterionKey({ kind: "actor", personId: 9 })).toBe(criterionKey({ kind: "director", personId: 9 }));
    expect(criterionKey({ kind: "theme", keywordIds: [2, 1] })).toBe(
      criterionKey({ kind: "theme", keywordIds: [1, 2] }),
    );
  });
});
