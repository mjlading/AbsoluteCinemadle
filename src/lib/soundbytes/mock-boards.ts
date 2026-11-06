import "server-only";

import type { Disguise, SoundCategory, SoundNode, SoundbytesBoard } from "./types";

/*
 * Mock boards for building the Soundbytes UI before the audio pipeline exists.
 * The films and casts are real (from TMDB), so search and actor checks work;
 * the clips are generated placeholder tones, shared between boards by category.
 * Swap a clip by replacing its file in public/audio/mock/ or pointing its url elsewhere.
 *
 * Labels stay vague on purpose: a role or a kind of sound, never a character,
 * place or signature thing that names the film on its own (see docs/SOUNDBYTES.md).
 */

const DISGUISE_FOR: Record<SoundCategory, Disguise> = { dialogue: "helium", score: "kazoo", sfx: "muffle" };

function node(
  id: string,
  slot: number,
  label: string,
  category: SoundCategory,
  variant: "a" | "b",
  free = false,
): SoundNode {
  const file = (version: "disguised" | "real") => `/audio/mock/${category}-${variant}-${version}.wav`;
  return {
    id,
    slot,
    label,
    category,
    disguise: DISGUISE_FOR[category],
    art: null,
    free,
    clips: { disguised: { url: file("disguised"), seconds: 2 }, real: { url: file("real"), seconds: 6 } },
  };
}

export const MOCK_BOARDS: SoundbytesBoard[] = [
  {
    id: "demo-1",
    name: "Demo 1",
    background: "corkboard",
    answer: {
      tmdbId: 329,
      title: "Jurassic Park",
      year: 1993,
      posterPath: "/d9mtMGQDLANKieb9PbD3yK7xxzo.jpg",
      cast: [
        { tmdbId: 4783, name: "Sam Neill" },
        { tmdbId: 4784, name: "Laura Dern" },
        { tmdbId: 4785, name: "Jeff Goldblum" },
        { tmdbId: 4786, name: "Richard Attenborough" },
        { tmdbId: 4789, name: "Bob Peck" },
        { tmdbId: 4790, name: "Martin Ferrero" },
        { tmdbId: 14592, name: "BD Wong" },
        { tmdbId: 4787, name: "Joseph Mazzello" },
      ],
    },
    nodes: [
      node("q7rk", 0, "Hero", "dialogue", "a", true),
      node("b2mx", 1, "Main theme", "score", "a"),
      node("h9tc", 2, "Footsteps", "sfx", "a"),
      node("w4pz", 3, "Boss", "dialogue", "b"),
      node("m6dj", 4, "Creature", "sfx", "b"),
      node("c1vf", 5, "Chase music", "score", "b"),
    ],
  },
  {
    id: "demo-2",
    name: "Demo 2",
    background: "sand",
    answer: {
      tmdbId: 11,
      title: "Star Wars",
      year: 1977,
      posterPath: "/fai0rspsNeJCS69wHNjOdWxcI7P.jpg",
      cast: [
        { tmdbId: 2, name: "Mark Hamill" },
        { tmdbId: 3, name: "Harrison Ford" },
        { tmdbId: 4, name: "Carrie Fisher" },
        { tmdbId: 5, name: "Peter Cushing" },
        { tmdbId: 12248, name: "Alec Guinness" },
        { tmdbId: 6, name: "Anthony Daniels" },
        { tmdbId: 130, name: "Kenny Baker" },
        { tmdbId: 24343, name: "Peter Mayhew" },
      ],
    },
    nodes: [
      node("t3gn", 0, "Villain", "dialogue", "a", true),
      node("y8sq", 1, "Machine", "sfx", "a"),
      node("f5lw", 2, "Fight music", "score", "a"),
      node("p0ke", 3, "Signature sound", "sfx", "b"),
      node("j2hu", 4, "Mentor", "dialogue", "b"),
      node("x6ac", 5, "Opening music", "score", "b"),
    ],
  },
  {
    id: "demo-3",
    name: "Demo 3",
    background: "asphalt",
    answer: {
      tmdbId: 438631,
      title: "Dune",
      year: 2021,
      posterPath: "/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg",
      cast: [
        { tmdbId: 1190668, name: "Timothée Chalamet" },
        { tmdbId: 933238, name: "Rebecca Ferguson" },
        { tmdbId: 25072, name: "Oscar Isaac" },
        { tmdbId: 117642, name: "Jason Momoa" },
        { tmdbId: 1640, name: "Stellan Skarsgård" },
        { tmdbId: 196179, name: "Stephen McKinley Henderson" },
        { tmdbId: 16851, name: "Josh Brolin" },
        { tmdbId: 3810, name: "Javier Bardem" },
      ],
    },
    nodes: [
      node("r9be", 0, "Wind", "sfx", "a", true),
      node("n4cy", 1, "Choir", "score", "a"),
      node("g7mo", 2, "Elder", "dialogue", "a"),
      node("s1xt", 3, "Machine", "sfx", "b"),
      node("e5wa", 4, "Hero", "dialogue", "b"),
      node("k8ri", 5, "Drums", "score", "b"),
    ],
  },
  {
    id: "demo-4",
    name: "Demo 4",
    background: "starfield",
    answer: {
      tmdbId: 155,
      title: "The Dark Knight",
      year: 2008,
      posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      cast: [
        { tmdbId: 3894, name: "Christian Bale" },
        { tmdbId: 1810, name: "Heath Ledger" },
        { tmdbId: 6383, name: "Aaron Eckhart" },
        { tmdbId: 3895, name: "Michael Caine" },
        { tmdbId: 1579, name: "Maggie Gyllenhaal" },
        { tmdbId: 64, name: "Gary Oldman" },
        { tmdbId: 192, name: "Morgan Freeman" },
        { tmdbId: 53651, name: "Monique Gabriela Curnen" },
      ],
    },
    nodes: [
      node("v2op", 0, "Main theme", "score", "a", true),
      node("d6zu", 1, "Villain", "dialogue", "a"),
      node("a3fi", 2, "Crash", "sfx", "a"),
      node("u7eh", 3, "Helper", "dialogue", "b"),
      node("o0lb", 4, "Engine", "sfx", "b"),
      node("i9nw", 5, "Strings", "score", "b"),
    ],
  },
];

export const getMockBoard = (id: string) => MOCK_BOARDS.find((board) => board.id === id) ?? null;
