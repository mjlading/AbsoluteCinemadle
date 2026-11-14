import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import {
  BoardBuildError,
  buildBoard,
  fewestFilmsToClear,
  isWellKnownActor,
  voteThresholds,
  type BoardSource,
  type CastEntry,
  type FilmCredit,
} from "./generate";

const B = RULES.castingCall.board;
/** The made-up TMDB's vote counts by rank: the film ranked n has 10,000,000 / n votes. */
const votesAtRank = (rank: number) => Math.round(10_000_000 / rank);
const VOTES = {
  wellKnown: votesAtRank(B.wellKnownRank),
  sharedMax: votesAtRank(B.sharedFilmRanks.from),
  sharedMin: votesAtRank(B.sharedFilmRanks.to),
};
/** Above every limit: a blockbuster. */
const WELL_KNOWN = VOTES.sharedMax * 2;
/** Right for a pair's shared film. */
const LESSER = Math.round((VOTES.sharedMin + VOTES.sharedMax) / 2);

/*
 * A small made-up TMDB: actors 1-8 are well known, each with their own
 * well-known films, and pair up through lesser-known films 901-904
 * (1 with 2, 3 with 4, ...). Actor 50 is in film 901 but well known for nothing.
 */
interface World {
  credits: Map<number, FilmCredit[]>;
  casts: Map<number, CastEntry[]>;
  wellKnownFilms: number[];
}

const credit = (tmdbId: number, voteCount: number, order = 0): FilmCredit => ({
  tmdbId,
  voteCount,
  order,
  genreIds: [18],
  asSelf: false,
  asVoice: false,
  video: false,
  hasReleaseDate: true,
});

function world(): World {
  const credits = new Map<number, FilmCredit[]>();
  const casts = new Map<number, CastEntry[]>();
  const wellKnownFilms: number[] = [];
  const addRole = (personId: number, film: FilmCredit) => {
    credits.set(personId, [...(credits.get(personId) ?? []), film]);
    casts.set(film.tmdbId, [...(casts.get(film.tmdbId) ?? []), { personId, order: film.order, hasPhoto: true }]);
  };
  for (let actor = 1; actor <= 8; actor++) {
    for (let k = 0; k < B.wellKnownRoles; k++) {
      const film = actor * 100 + k;
      addRole(actor, credit(film, WELL_KNOWN));
      if (k === 0) wellKnownFilms.push(film);
    }
  }
  for (let pair = 0; pair < 4; pair++) {
    addRole(2 * pair + 1, credit(901 + pair, LESSER, 0));
    addRole(2 * pair + 2, credit(901 + pair, LESSER, 1));
  }
  addRole(50, credit(901, LESSER, 2));
  addRole(50, credit(950, WELL_KNOWN, 0));
  return { credits, casts, wellKnownFilms };
}

const sourceOf = (w: World): BoardSource => ({
  mostVotedFilms: async () => w.wellKnownFilms,
  votesAtRank: async (rank) => votesAtRank(rank),
  filmCast: async (id) => w.casts.get(id) ?? [],
  personFilms: async (id) => w.credits.get(id) ?? [],
});

describe("fewestFilmsToClear", () => {
  it("finds the smallest set of films that covers every face", () => {
    expect(fewestFilmsToClear([[1], [1], [2], [2]], 5)).toBe(2);
    expect(fewestFilmsToClear([[1, 9], [2, 9], [3], [3]], 5)).toBe(2);
    expect(fewestFilmsToClear([[1], [2], [3], [4]], 5)).toBe(4);
  });

  it("gives up past the limit", () => {
    expect(fewestFilmsToClear([[1], [2], [3]], 2)).toBe(Infinity);
  });
});

describe("voteThresholds", () => {
  it("turns the ranks in the rules into today's vote counts, so they keep up as votes grow", async () => {
    const source = sourceOf(world());
    expect(await voteThresholds(source)).toEqual(VOTES);
    const doubled = { ...source, votesAtRank: async (rank: number) => votesAtRank(rank) * 2 };
    expect(await voteThresholds(doubled)).toEqual({
      wellKnown: VOTES.wellKnown * 2,
      sharedMin: VOTES.sharedMin * 2,
      sharedMax: VOTES.sharedMax * 2,
    });
  });
});

describe("isWellKnownActor", () => {
  const roles = (n: number, override: Partial<FilmCredit> = {}) =>
    Array.from({ length: n }, (_, i) => ({ ...credit(i, WELL_KNOWN), ...override }));

  it("needs enough starring roles in well-known films", () => {
    expect(isWellKnownActor(roles(B.wellKnownRoles), VOTES)).toBe(true);
    expect(isWellKnownActor(roles(B.wellKnownRoles - 1), VOTES)).toBe(false);
  });

  it("doesn't count small parts, cameos as themselves, voice parts, animation or lesser-known films", () => {
    expect(isWellKnownActor(roles(B.wellKnownRoles, { order: B.starringOrder + 1 }), VOTES)).toBe(false);
    expect(isWellKnownActor(roles(B.wellKnownRoles, { asSelf: true }), VOTES)).toBe(false);
    expect(isWellKnownActor(roles(B.wellKnownRoles, { asVoice: true }), VOTES)).toBe(false);
    expect(isWellKnownActor(roles(B.wellKnownRoles, { genreIds: [16] }), VOTES)).toBe(false);
    expect(isWellKnownActor(roles(B.wellKnownRoles, { voteCount: VOTES.wellKnown - 1 }), VOTES)).toBe(false);
  });
});

describe("buildBoard", () => {
  it("pairs eight well-known actors through the lesser-known films they share", async () => {
    const w = world();
    const board = await buildBoard(sourceOf(w), { seed: "2026-11-20" });

    expect(board.personIds).toHaveLength(RULES.castingCall.faceCount);
    expect(new Set(board.personIds).size).toBe(RULES.castingCall.faceCount);
    expect(board.personIds).not.toContain(50);
    expect(board.pairs).toHaveLength(B.pairs);
    for (const { filmId, faces } of board.pairs) {
      const cast = w.casts.get(filmId)!.map((c) => c.personId);
      for (const face of faces) expect(cast).toContain(board.personIds[face]);
    }
    expect(board.pairs.flatMap((p) => p.faces).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("builds the same board for the same seed", async () => {
    const one = await buildBoard(sourceOf(world()), { seed: "2026-11-20" });
    const two = await buildBoard(sourceOf(world()), { seed: "2026-11-20" });
    expect(two).toEqual(one);
  });

  it("refuses a pair that also shares a well-known film", async () => {
    const w = world();
    w.credits.get(1)!.push(credit(999, WELL_KNOWN, 3));
    w.credits.get(2)!.push(credit(999, WELL_KNOWN, 3));
    await expect(buildBoard(sourceOf(w), { seed: "x" })).rejects.toThrow(BoardBuildError);
  });

  it("refuses a board some film clears too quickly", async () => {
    const w = world();
    // Two small films, each with one actor from every pair: two guesses would clear the board.
    for (const actor of [1, 3, 5, 7]) w.credits.get(actor)!.push(credit(990, 5, 20));
    for (const actor of [2, 4, 6, 8]) w.credits.get(actor)!.push(credit(991, 5, 20));
    await expect(buildBoard(sourceOf(w), { seed: "x" })).rejects.toThrow(BoardBuildError);
  });

  it("leaves out actors and films used on nearby days", async () => {
    await expect(buildBoard(sourceOf(world()), { seed: "x", avoidPeople: new Set([1]) })).rejects.toThrow(
      BoardBuildError,
    );
    await expect(buildBoard(sourceOf(world()), { seed: "x", avoidFilms: new Set([902]) })).rejects.toThrow(
      BoardBuildError,
    );
  });
});
