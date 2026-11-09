/*
 * Casting call boards: eight actors each, by TMDB person id. Each board pairs
 * or groups actors from separate well-known films, so no ordinary film crosses
 * out more than two or three faces. Boards run from easiest to hardest: the
 * first two take at least three films, the rest at least four, and all can be
 * cleared within the guess limit.
 * Which actors are on a board is the puzzle, so this file stays server-side.
 */

export interface CastingCallBoard {
  id: string;
  /** Spoiler-free name for the board list. */
  name: string;
  /** Exactly RULES.castingCall.faceCount ids; a face's id is its position here. */
  personIds: readonly number[];
}

export const BOARDS: readonly CastingCallBoard[] = [
  {
    id: "1",
    name: "Board 1",
    // Titanic, Forrest Gump, The Matrix.
    personIds: [6193, 204, 1954, 31, 32, 33, 6384, 2975],
  },
  {
    id: "2",
    name: "Board 2",
    // Jurassic Park, Back to the Future, Alien.
    personIds: [4783, 4784, 4785, 521, 1062, 1063, 10205, 4139],
  },
  {
    id: "3",
    name: "Board 3",
    // Pretty Woman, Se7en, La La Land, The Silence of the Lambs.
    personIds: [1204, 1205, 192, 287, 30614, 54693, 4173, 1038],
  },
  {
    id: "4",
    name: "Board 4",
    // Mad Max: Fury Road, Gladiator, The Shining, Kill Bill.
    personIds: [2524, 6885, 934, 73421, 514, 10409, 139, 141],
  },
  {
    id: "5",
    name: "Board 5",
    // The Terminator, Die Hard, Grease, Ghostbusters.
    personIds: [1100, 2713, 62, 4566, 8891, 8892, 1532, 707],
  },
  {
    id: "6",
    name: "Board 6",
    // Get Out, Black Swan, The Social Network, Whiplash.
    personIds: [206919, 1255540, 524, 18973, 44735, 37625, 996701, 18999],
  },
];

export const getBoard = (id: string) => BOARDS.find((b) => b.id === id) ?? null;

/** A face's opaque id: its position on the board, which says nothing about who it is. */
export const faceIds = (board: CastingCallBoard) => board.personIds.map((_, i) => String(i));
