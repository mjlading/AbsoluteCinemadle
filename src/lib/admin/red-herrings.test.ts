import { describe, expect, it } from "vitest";

import { bestKnownOtherFilms, sharedPeople, type FilmCredits } from "./red-herrings";

const cast = (personId: number, name: string, character: string, order: number) => ({
  personId,
  name,
  character,
  profilePath: `/p${personId}.jpg`,
  order,
});

const raiders: FilmCredits = {
  tmdbId: 85,
  title: "Raiders of the Lost Ark",
  cast: [cast(3, "Harrison Ford", "Indiana Jones", 0), cast(4, "Karen Allen", "Marion", 1)],
  directors: [{ personId: 488, name: "Steven Spielberg", job: "Director" }],
};
const bladeRunner: FilmCredits = {
  tmdbId: 78,
  title: "Blade Runner",
  cast: [cast(3, "Harrison Ford", "Rick Deckard", 0), cast(5, "Rutger Hauer", "Roy Batty", 1)],
  directors: [{ personId: 578, name: "Ridley Scott", job: "Director" }],
};
const jaws: FilmCredits = {
  tmdbId: 578,
  title: "Jaws",
  cast: [cast(6, "Roy Scheider", "Martin Brody", 0)],
  directors: [{ personId: 488, name: "Steven Spielberg", job: "Director" }],
};

describe("sharedPeople", () => {
  it("finds actors and directors who link the chosen films", () => {
    expect(sharedPeople([raiders, bladeRunner, jaws])).toEqual([
      {
        personId: 3,
        name: "Harrison Ford",
        profilePath: "/p3.jpg",
        credits: [
          { tmdbId: 85, title: "Raiders of the Lost Ark", role: "as Indiana Jones" },
          { tmdbId: 78, title: "Blade Runner", role: "as Rick Deckard" },
        ],
      },
      {
        personId: 488,
        name: "Steven Spielberg",
        profilePath: null,
        credits: [
          { tmdbId: 85, title: "Raiders of the Lost Ark", role: "director" },
          { tmdbId: 578, title: "Jaws", role: "director" },
        ],
      },
    ]);
  });

  it("ignores cast billed below the depth limit", () => {
    expect(sharedPeople([raiders, bladeRunner], 0).map((p) => p.name)).toEqual([]);
  });
});

describe("bestKnownOtherFilms", () => {
  const film = (tmdbId: number, voteCount: number) => ({
    tmdbId,
    title: `Film ${tmdbId}`,
    year: 2000,
    posterPath: null,
    voteCount,
  });

  it("ranks by vote count, merges acting and directing, and skips puzzle films", () => {
    const filmography = { acted: [film(1, 10), film(2, 500), film(85, 9000)], directed: [film(2, 500), film(3, 50)] };
    expect(bestKnownOtherFilms(filmography, new Set([85]), 2).map((f) => f.tmdbId)).toEqual([2, 3]);
  });
});
