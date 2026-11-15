import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";
import { isFairPair, marginOf, pickRounds, questionOrder, winnerOf, type CandidateFilm } from "./pick";
import { formatMoney, formatRuntime, QUESTION_KINDS } from "./questions";

const rules = RULES.doubleFeature.board;

const film = (id: number, over: Partial<CandidateFilm> = {}): CandidateFilm => ({
  tmdbId: id,
  title: `Film ${id}`,
  releaseDate: "2010-06-01",
  runtime: 120,
  budget: 50_000_000,
  revenue: 200_000_000,
  rating: 7,
  voteCount: 10_000,
  posterPath: `/p${id}.jpg`,
  ...over,
});

/** A varied, deterministic set of films. */
const many = (n: number) => {
  const rng = seededRandom("films");
  return Array.from({ length: n }, (_, i) =>
    film(i + 1, {
      releaseDate: `${1980 + Math.floor(rng() * 45)}-0${1 + Math.floor(rng() * 9)}-15`,
      runtime: 85 + Math.floor(rng() * 80),
      budget: rng() < 0.15 ? null : Math.round(5 + rng() * 250) * 1e6,
      revenue: rng() < 0.15 ? null : Math.round(10 + rng() * 1500) * 1e6,
      rating: Math.round((5.5 + rng() * 3) * 10) / 10,
      voteCount: Math.round(5000 + rng() * 30000),
    }),
  );
};

describe("formatting", () => {
  it("reads runtimes and money as the reveal shows them", () => {
    expect(formatRuntime(142)).toBe("2h 22m");
    expect(formatRuntime(120)).toBe("2h");
    expect(formatMoney(63_000_000)).toBe("$63 million");
    expect(formatMoney(6_500_000)).toBe("$6.5 million");
    expect(formatMoney(1_200_000_000)).toBe("$1.2 billion");
    expect(formatMoney(2_923_706_026)).toBe("$2.92 billion");
  });
});

describe("fair pairs", () => {
  it("needs a clear margin, but not an absurd one", () => {
    expect(isFairPair("runtime", film(1, { runtime: 120 }), film(2, { runtime: 125 }), rules)).toBe(false);
    expect(isFairPair("runtime", film(1, { runtime: 120 }), film(2, { runtime: 135 }), rules)).toBe(true);
    expect(isFairPair("runtime", film(1, { runtime: 90 }), film(2, { runtime: 200 }), rules)).toBe(false);
    expect(isFairPair("rating", film(1, { rating: 7.1 }), film(2, { rating: 7.3 }), rules)).toBe(false);
    expect(isFairPair("rating", film(1, { rating: 7.1 }), film(2, { rating: 7.4 }), rules)).toBe(true);
    expect(isFairPair("budget", film(1, { budget: 100e6 }), film(2, { budget: 110e6 }), rules)).toBe(false);
    expect(isFairPair("budget", film(1, { budget: 100e6 }), film(2, { budget: 130e6 }), rules)).toBe(true);
  });

  it("never asks about a value TMDB doesn't know", () => {
    expect(isFairPair("revenue", film(1, { revenue: null }), film(2), rules)).toBe(false);
  });

  it("only compares money between films of a similar era", () => {
    const old = film(1, { releaseDate: "1985-01-01", budget: 20e6 });
    expect(isFairPair("budget", old, film(2, { releaseDate: "1995-01-01" }), rules)).toBe(true);
    expect(isFairPair("budget", old, film(2, { releaseDate: "2005-01-01" }), rules)).toBe(false);
  });

  it("counts years by calendar year and lets the earlier film win", () => {
    const a = film(1, { releaseDate: "1999-12-30" });
    const b = film(2, { releaseDate: "2001-01-02" });
    expect(marginOf("release", 1999, 2001)).toBe(2);
    expect(isFairPair("release", a, b, rules)).toBe(true);
    expect(winnerOf("release", a, b)).toBe(0);
    expect(winnerOf("runtime", film(1, { runtime: 100 }), film(2, { runtime: 130 }))).toBe(1);
  });
});

describe("question order", () => {
  it("asks each kind equally often, never twice in a row", () => {
    const order = questionOrder(10, seededRandom("x"));
    for (const kind of QUESTION_KINDS) expect(order.filter((k) => k === kind)).toHaveLength(2);
    order.forEach((k, i) => i > 0 && expect(k).not.toBe(order[i - 1]));
  });
});

describe("pickRounds", () => {
  const films = many(100);

  it("is the same for the same seed and differs between seeds", () => {
    const a = pickRounds(films, seededRandom("day-1"));
    expect(pickRounds(films, seededRandom("day-1"))).toEqual(a);
    expect(pickRounds(films, seededRandom("day-2"))).not.toEqual(a);
  });

  it("fills every round with fair pairs, no film twice, winner on both sides across days", () => {
    const sides = new Set<number>();
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const rounds = pickRounds(films, seededRandom(seed));
      expect(rounds).toHaveLength(RULES.doubleFeature.rounds);
      const ids = rounds.flatMap((r) => r.films.map((f) => f.tmdbId));
      expect(new Set(ids).size).toBe(ids.length);
      for (const r of rounds) {
        sides.add(r.correct);
        const [a, b] = r.films.map((f) => films.find((c) => c.tmdbId === f.tmdbId)!);
        expect(isFairPair(r.kind, a, b, rules)).toBe(true);
        expect(winnerOf(r.kind, a, b)).toBe(r.correct);
      }
    }
    expect(sides).toEqual(new Set([0, 1]));
  });

  it("never puts two films of the same title on a board", () => {
    const remakes = [...films.slice(0, 30), ...films.slice(30, 60).map((f) => ({ ...f, title: "The Mummy" }))];
    const rounds = pickRounds(remakes, seededRandom("remakes"));
    const titles = rounds.flatMap((r) => r.films.map((f) => f.title));
    expect(titles.filter((t) => t === "The Mummy").length).toBeLessThanOrEqual(1);
  });
});
