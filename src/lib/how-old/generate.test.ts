import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";
import {
  bandOf,
  buildRounds,
  candidatesFor,
  isWellKnown,
  planBands,
  type FilmCredit,
  type HowOldSource,
  type PersonDetails,
} from "./generate";

const B = RULES.howOld.board;
const DATE = "2026-11-15";

const credit = (tmdbId: number, releaseDate: string, extra: Partial<FilmCredit> = {}): FilmCredit => ({
  tmdbId,
  title: `Film ${tmdbId}`,
  releaseDate,
  posterPath: `/p${tmdbId}.jpg`,
  voteCount: 10_000,
  order: 0,
  genreIds: [18],
  character: `Role ${tmdbId}`,
  video: false,
  ...extra,
});

const person = (personId: number, birthday: string | null, films: FilmCredit[]): PersonDetails => ({
  personId,
  name: `Actor ${personId}`,
  birthday,
  deathday: null,
  films,
});

describe("candidatesFor", () => {
  it("keeps lead roles in well-known films with the age at release", () => {
    const p = person(1, "1956-07-09", [credit(13, "1994-06-23")]);
    expect(candidatesFor(p, 5000, DATE)).toMatchObject([{ filmId: 13, age: 37, band: bandOf(37) }]);
  });

  it("skips voices, cameos, animation, documentaries, minor billing, missing dates and unreleased films", () => {
    const p = person(1, "1956-07-09", [
      credit(1, "1994-01-01", { character: "Woody (voice)" }),
      credit(2, "1994-01-01", { character: "Himself" }),
      credit(3, "1994-01-01", { genreIds: [16, 35] }),
      credit(4, "1994-01-01", { genreIds: [99] }),
      credit(5, "1994-01-01", { order: B.leadOrder + 1 }),
      credit(6, "1994"),
      credit(7, "2027-01-01"),
      credit(8, "1994-01-01", { voteCount: 10 }),
      credit(9, "1994-01-01", { posterPath: null }),
    ]);
    expect(candidatesFor(p, 5000, DATE)).toEqual([]);
  });

  it("skips people without a full birthday", () => {
    expect(candidatesFor(person(1, "1956", [credit(13, "1994-06-23")]), 5000, DATE)).toEqual([]);
    expect(candidatesFor(person(1, null, [credit(13, "1994-06-23")]), 5000, DATE)).toEqual([]);
  });

  it("weights roles far from the middle of the career higher", () => {
    const p = person(1, "1960-01-01", [
      credit(1, "1972-05-01"),
      credit(2, "1995-05-01"),
      credit(3, "1996-05-01"),
      credit(4, "1997-05-01"),
    ]);
    const byFilm = new Map(candidatesFor(p, 5000, DATE).map((c) => [c.filmId, c.weight]));
    expect(byFilm.get(1)!).toBeGreaterThan(byFilm.get(3)!);
  });
});

describe("isWellKnown", () => {
  it("needs enough leading roles in well-known films", () => {
    const films = Array.from({ length: B.fameRoles }, (_, i) => credit(i + 1, "2000-01-01"));
    expect(isWellKnown(person(1, "1970-01-01", films), 5000, DATE)).toBe(true);
    expect(isWellKnown(person(1, "1970-01-01", films.slice(1)), 5000, DATE)).toBe(false);
  });
});

describe("planBands", () => {
  it("spreads a board over the age bands", () => {
    for (let s = 0; s < 200; s++) {
      const plan = planBands(seededRandom(`seed${s}`));
      const counts = new Map<number, number>();
      for (const band of plan) counts.set(band, (counts.get(band) ?? 0) + 1);
      expect(plan).toHaveLength(RULES.howOld.rounds);
      expect(counts.size).toBeGreaterThanOrEqual(B.minBands);
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(B.maxPerBand);
    }
  });
});

/** A fake TMDB: one seed film per decade, each with three leads, each of whom made many films of their own. */
function fakeSource(): HowOldSource {
  const people = new Map<number, PersonDetails>();
  let filmId = 1000;
  for (let id = 1; id <= 40; id++) {
    const born = 1930 + id * 2;
    const films = Array.from({ length: 8 }, (_, k) => credit(filmId++, `${born + 8 + k * 7}-06-01`));
    people.set(id, person(id, `${born}-03-15`, films));
  }
  return {
    decadeFilms: async (from) => [from],
    votesAtRank: async () => 5000,
    filmLeads: async (film) => {
      const base = ((film - 1960) / 10) * 5;
      return [0, 1, 2, 3, 4].map((i) => ({ personId: (base + i) % 40 || 40, order: i }));
    },
    person: async (id) => people.get(id)!,
  };
}

describe("buildRounds", () => {
  it("builds the same board for the same seed, with no actor or film twice and mixed ages", async () => {
    const a = await buildRounds(fakeSource(), "how-old:x", DATE);
    const b = await buildRounds(fakeSource(), "how-old:x", DATE);
    expect(a).toEqual(b);
    expect(a).toHaveLength(RULES.howOld.rounds);
    expect(new Set(a.map((r) => r.personId)).size).toBe(a.length);
    expect(new Set(a.map((r) => r.filmId)).size).toBe(a.length);
    expect(new Set(a.map((r) => bandOf(r.age))).size).toBeGreaterThanOrEqual(B.minBands);
  });

  it("leaves out nearby days' actors when it can", async () => {
    const first = await buildRounds(fakeSource(), "how-old:y", DATE);
    const avoid = { people: new Set(first.map((r) => r.personId)), films: new Set<number>() };
    const second = await buildRounds(fakeSource(), "how-old:y", DATE, avoid);
    expect(second.some((r) => avoid.people.has(r.personId))).toBe(false);
  });
});
