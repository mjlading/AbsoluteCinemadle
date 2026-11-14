import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";

/*
 * Builds a daily Casting call board: well-known actors in pairs, each pair
 * sharing a lesser-known film and no well-known one. Clearing the board in
 * few guesses means knowing those films; naming each actor's famous films
 * one at a time crosses out one face per guess and runs out of guesses.
 *
 * It only sees TMDB through `BoardSource`, so it can be tested without the network.
 */

export interface CastEntry {
  personId: number;
  order: number;
  hasPhoto: boolean;
}

export interface FilmCredit {
  tmdbId: number;
  voteCount: number;
  order: number;
  genreIds: number[];
  asSelf: boolean;
  asVoice: boolean;
  video: boolean;
  hasReleaseDate: boolean;
}

export interface BoardSource {
  /** Well-known films, by TMDB id, to find actors through. */
  wellKnownFilms(): Promise<number[]>;
  filmCast(tmdbId: number): Promise<CastEntry[]>;
  personFilms(personId: number): Promise<FilmCredit[]>;
}

export interface BoardPair {
  /** The lesser-known film the two share. */
  filmId: number;
  /** The two faces, as positions on the board. */
  faces: [number, number];
}

export interface BuiltBoard {
  /** In board order, shuffled so a pair doesn't sit side by side. */
  personIds: number[];
  /** The best route: one film per pair. */
  pairs: BoardPair[];
}

export interface BuildOptions {
  seed: string;
  /** Actors and films used on nearby days. */
  avoidPeople?: ReadonlySet<number>;
  avoidFilms?: ReadonlySet<number>;
}

const B = RULES.castingCall.board;
/** Animation (voices, not faces), documentary and TV film. */
const LEFT_OUT_GENRES = new Set([16, 99, 10770]);
/** Lesser-known films tried per actor before moving to another actor. */
const SHARED_FILMS_TRIED = 6;
const ATTEMPTS = 3;

export class BoardBuildError extends Error {}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** An on-screen acting role in a proper film. */
const isRole = (c: FilmCredit) =>
  !c.video && !c.asSelf && !c.asVoice && c.hasReleaseDate && !c.genreIds.some((g) => LEFT_OUT_GENRES.has(g));

export const isWellKnownActor = (films: readonly FilmCredit[]) =>
  films.filter((c) => isRole(c) && c.voteCount >= B.wellKnownVotes && c.order <= B.starringOrder).length >=
  B.wellKnownRoles;

const isLesserKnown = (c: FilmCredit) =>
  isRole(c) &&
  c.voteCount >= B.sharedFilmVotes.min &&
  c.voteCount < B.sharedFilmVotes.max &&
  c.order <= B.sharedFilmOrder;

/**
 * The fewest films that cross out every face, where each film is the set of
 * faces in its cast (a bitmask); Infinity if it takes more than `max`.
 * Counts every film anyone is credited in, since any of them is a fair guess.
 */
export function fewestFilmsToClear(filmsByFace: readonly (readonly number[])[], max: number): number {
  const full = (1 << filmsByFace.length) - 1;
  const masks = new Map<number, number>();
  filmsByFace.forEach((films, face) => {
    for (const film of films) masks.set(film, (masks.get(film) ?? 0) | (1 << face));
  });
  const options = [...new Set(masks.values())];
  let frontier = new Set([0]);
  const seen = new Set([0]);
  for (let k = 1; k <= max; k++) {
    const next = new Set<number>();
    for (const covered of frontier) {
      for (const mask of options) {
        const union = covered | mask;
        if (union === full) return k;
        if (!seen.has(union)) {
          seen.add(union);
          next.add(union);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

async function attempt(source: BoardSource, random: () => number, options: BuildOptions): Promise<BuiltBoard | null> {
  const avoidPeople = options.avoidPeople ?? new Set<number>();
  const avoidFilms = options.avoidFilms ?? new Set<number>();
  const used = new Set<number>();
  const chosen: { personId: number; films: FilmCredit[] }[] = [];
  const pairFilms: number[] = [];
  const free = (personId: number) => !used.has(personId) && !avoidPeople.has(personId);

  for (const film of shuffled(await source.wellKnownFilms(), random)) {
    if (pairFilms.length === B.pairs) break;
    // An actor from the top of a well-known film's billing...
    const leads = (await source.filmCast(film)).filter((c) => c.order <= 2 && c.hasPhoto && free(c.personId));
    const lead = shuffled(leads, random)[0];
    if (!lead) continue;
    const leadFilms = await source.personFilms(lead.personId);
    if (!isWellKnownActor(leadFilms)) continue;
    // ...and a well-known co-star from one of their lesser-known films, with no well-known film in common.
    const leadKnown = new Set(leadFilms.filter((c) => c.voteCount >= B.sharedFilmVotes.max).map((c) => c.tmdbId));
    const shared = shuffled(
      leadFilms.filter((c) => isLesserKnown(c) && !avoidFilms.has(c.tmdbId)),
      random,
    ).slice(0, SHARED_FILMS_TRIED);
    let pair: { personId: number; films: FilmCredit[]; filmId: number } | null = null;
    for (const sharedFilm of shared) {
      const coStars = (await source.filmCast(sharedFilm.tmdbId)).filter(
        (c) => c.personId !== lead.personId && c.order <= B.sharedFilmOrder && c.hasPhoto && free(c.personId),
      );
      for (const coStar of shuffled(coStars, random)) {
        const films = await source.personFilms(coStar.personId);
        if (!isWellKnownActor(films) || films.some((c) => leadKnown.has(c.tmdbId))) continue;
        pair = { personId: coStar.personId, films, filmId: sharedFilm.tmdbId };
        break;
      }
      if (pair) break;
    }
    if (!pair) continue;
    chosen.push({ personId: lead.personId, films: leadFilms }, { personId: pair.personId, films: pair.films });
    used.add(lead.personId).add(pair.personId);
    pairFilms.push(pair.filmId);
  }
  if (pairFilms.length < B.pairs) return null;

  const fewest = fewestFilmsToClear(
    chosen.map((c) => c.films.map((f) => f.tmdbId)),
    RULES.castingCall.maxGuesses,
  );
  if (fewest < B.minFilmsToClear) return null;

  // Shuffle the faces so the board's layout says nothing about who pairs with whom.
  const order = shuffled(
    chosen.map((_, i) => i),
    random,
  );
  const position = new Map(order.map((from, to) => [from, to]));
  return {
    personIds: order.map((from) => chosen[from].personId),
    pairs: pairFilms.map((filmId, i) => ({
      filmId,
      faces: [position.get(2 * i)!, position.get(2 * i + 1)!].sort((a, b) => a - b) as [number, number],
    })),
  };
}

/** Builds a board, the same one for the same seed and TMDB data. */
export async function buildBoard(source: BoardSource, options: BuildOptions): Promise<BuiltBoard> {
  if (B.pairs * 2 !== RULES.castingCall.faceCount) throw new BoardBuildError("Pairs must fill the board.");
  const random = seededRandom(options.seed);
  for (let i = 0; i < ATTEMPTS; i++) {
    const board = await attempt(source, random, options);
    if (board) return board;
  }
  throw new BoardBuildError(`No board could be built for seed ${options.seed}.`);
}
