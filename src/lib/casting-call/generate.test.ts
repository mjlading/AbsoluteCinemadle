import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";
import {
  BoardBuildError,
  buildBoard,
  fewestFilmsToClear,
  hasPairRoute,
  isWellKnownActor,
  layoutsInOrder,
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
/** Right for a group's shared film. */
const LESSER = Math.round((VOTES.sharedMin + VOTES.sharedMax) / 2);

/*
 * A small made-up TMDB: actors 1-8 are well known, each with their own
 * well-known films, and share lesser-known films in the groups given
 * (film 901 for the first group, 902 for the next, ...).
 * Actor 50 is in film 901 too but well known for nothing.
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

const PAIRS = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
];
const TRIOS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8],
];

function world(groups: number[][] = PAIRS): World {
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
  groups.forEach((group, g) => group.forEach((actor, order) => addRole(actor, credit(901 + g, LESSER, order))));
  addRole(50, credit(901, LESSER, 3));
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

describe("hasPairRoute", () => {
  const films = (...ids: number[]) => ids.map((id) => credit(id, LESSER, 1));

  it("finds a way to split the faces into pairs that each share a film", () => {
    // Faces 0-1-2 share film 1; 2 and 3 share film 2: pairs 0+1 and 2+3.
    expect(hasPairRoute([films(1), films(1), films(1, 2), films(2)])).toBe(true);
  });

  it("finds none when someone has nobody left to pair with", () => {
    // A trio and a lone pair: whoever pairs inside the trio leaves the third alone.
    expect(hasPairRoute([films(1), films(1), films(1), films(2)])).toBe(false);
  });

  it("only counts films where both are billed high", () => {
    const low = (id: number) => [credit(id, LESSER, B.sharedFilmOrder + 1)];
    expect(hasPairRoute([films(1), low(1), films(2), films(2)])).toBe(false);
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

/** Every group's faces are in its film, and the groups cover the board once. */
function expectSound(w: World, board: Awaited<ReturnType<typeof buildBoard>>) {
  expect(board.personIds).toHaveLength(RULES.castingCall.faceCount);
  expect(new Set(board.personIds).size).toBe(RULES.castingCall.faceCount);
  expect(board.personIds).not.toContain(50);
  for (const { filmId, faces } of board.groups) {
    const cast = w.casts.get(filmId)!.map((c) => c.personId);
    for (const face of faces) expect(cast).toContain(board.personIds[face]);
  }
  expect(board.groups.flatMap((g) => g.faces).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
}

const sizes = (board: Awaited<ReturnType<typeof buildBoard>>) =>
  board.groups.map((g) => g.faces.length).sort((a, b) => b - a);

describe("buildBoard", () => {
  it("groups eight well-known actors as 3+3+2 through the lesser-known films they share", async () => {
    const w = world(TRIOS);
    const board = await buildBoard(sourceOf(w), { seed: "2026-11-20" });
    expectSound(w, board);
    expect(sizes(board)).toEqual([3, 3, 2]);
  });

  it("falls back to pairs when no trios can be found", async () => {
    const w = world(PAIRS);
    const board = await buildBoard(sourceOf(w), { seed: "2026-11-20" });
    expectSound(w, board);
    expect(sizes(board)).toEqual([2, 2, 2, 2]);
  });

  it("picks the day's layout by weight, mostly 3+3+2, with the others as fallbacks", () => {
    const random = seededRandom("layouts");
    const firsts = Array.from({ length: 400 }, () => layoutsInOrder(random));
    const trios = firsts.filter((order) => order[0].length === 3).length;
    expect(trios / firsts.length).toBeGreaterThan(0.65);
    expect(trios / firsts.length).toBeLessThan(0.85);
    for (const order of firsts) expect(order).toHaveLength(B.layouts.length);
  });

  it("builds the same board for the same seed", async () => {
    const one = await buildBoard(sourceOf(world(TRIOS)), { seed: "2026-11-20" });
    const two = await buildBoard(sourceOf(world(TRIOS)), { seed: "2026-11-20" });
    expect(two).toEqual(one);
  });

  it("refuses a group where two also share a well-known film", async () => {
    const w = world(PAIRS);
    w.credits.get(1)!.push(credit(999, WELL_KNOWN, 3));
    w.credits.get(2)!.push(credit(999, WELL_KNOWN, 3));
    await expect(buildBoard(sourceOf(w), { seed: "x" })).rejects.toThrow(BoardBuildError);
  });

  it("refuses a board some films clear in fewer guesses than it has groups", async () => {
    const w = world(PAIRS);
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
