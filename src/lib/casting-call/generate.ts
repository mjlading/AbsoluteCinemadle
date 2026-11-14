import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";

/*
 * Builds a daily Casting call board: well-known actors in groups (3+3+2 on
 * most days, 2+2+2+2 on others), each group sharing a lesser-known film and
 * no two of them a well-known one. Clearing the board in few guesses means
 * knowing those films; naming each actor's famous films one at a time crosses
 * out one face per guess and runs out of guesses.
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
  /** The films with the most TMDB votes, by id, most first. */
  mostVotedFilms(count: number): Promise<number[]>;
  /** The vote count of the film at this rank (1 is the most voted), now. */
  votesAtRank(rank: number): Promise<number>;
  filmCast(tmdbId: number): Promise<CastEntry[]>;
  personFilms(personId: number): Promise<FilmCredit[]>;
}

export interface BoardGroup {
  /** The lesser-known film the group shares. */
  filmId: number;
  /** Its faces, as positions on the board. */
  faces: number[];
}

export interface BuiltBoard {
  /** In board order, shuffled so a group doesn't sit side by side. */
  personIds: number[];
  /** The best route: one film per group. */
  groups: BoardGroup[];
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
/** Lesser-known films tried per lead before moving to another lead. */
const SHARED_FILMS_TRIED = 6;
/** Lead actors tried for one group before the attempt gives up, so a build never walks every film. */
const LEADS_PER_GROUP = 40;
/**
 * Tries at the day's layout before falling back to the next. A layout with a trio tries this
 * many times for a board that can also be cleared in pairs, then settles for its first valid board.
 */
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

/** The ranks in RULES.castingCall.board as vote counts today. */
export interface VoteThresholds {
  /** A film with at least this many votes is well known. */
  wellKnown: number;
  /** A group's shared film has at least `sharedMin` votes and fewer than `sharedMax`; no two in a group share a film above it. */
  sharedMin: number;
  sharedMax: number;
}

export async function voteThresholds(source: BoardSource): Promise<VoteThresholds> {
  const [wellKnown, sharedMax, sharedMin] = await Promise.all([
    source.votesAtRank(B.wellKnownRank),
    source.votesAtRank(B.sharedFilmRanks.from),
    source.votesAtRank(B.sharedFilmRanks.to),
  ]);
  return { wellKnown, sharedMin, sharedMax };
}

export const isWellKnownActor = (films: readonly FilmCredit[], votes: VoteThresholds) =>
  films.filter((c) => isRole(c) && c.voteCount >= votes.wellKnown && c.order <= B.starringOrder).length >=
  B.wellKnownRoles;

const isLesserKnown = (c: FilmCredit, votes: VoteThresholds) =>
  isRole(c) && c.voteCount >= votes.sharedMin && c.voteCount < votes.sharedMax && c.order <= B.sharedFilmOrder;

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

interface Member {
  personId: number;
  films: FilmCredit[];
}

/** Picks lead films off a shuffled list, shared by every group on the board. */
type LeadFilms = { next(): number | undefined };

/**
 * One group: a well-known lead from the top of a well-known film's billing, and
 * well-known co-stars from one of the lead's lesser-known films, where no two
 * of them share a well-known film.
 */
async function findGroup(
  size: number,
  source: BoardSource,
  random: () => number,
  votes: VoteThresholds,
  leadFilms: LeadFilms,
  free: (personId: number) => boolean,
  avoidFilms: ReadonlySet<number>,
): Promise<{ filmId: number; members: Member[] } | null> {
  const knownTogether = (a: FilmCredit[], b: FilmCredit[]) => {
    const known = new Set(a.filter((c) => c.voteCount >= votes.sharedMax).map((c) => c.tmdbId));
    return b.some((c) => known.has(c.tmdbId));
  };
  for (let tried = 0, film = leadFilms.next(); film !== undefined && tried < LEADS_PER_GROUP; film = leadFilms.next()) {
    tried++;
    const leads = (await source.filmCast(film)).filter((c) => c.order <= 2 && c.hasPhoto && free(c.personId));
    const lead = shuffled(leads, random)[0];
    if (!lead) continue;
    const lead_ = { personId: lead.personId, films: await source.personFilms(lead.personId) };
    if (!isWellKnownActor(lead_.films, votes)) continue;
    const shared = shuffled(
      lead_.films.filter((c) => isLesserKnown(c, votes) && !avoidFilms.has(c.tmdbId)),
      random,
    ).slice(0, SHARED_FILMS_TRIED);
    for (const sharedFilm of shared) {
      const coStars = (await source.filmCast(sharedFilm.tmdbId)).filter(
        (c) => c.personId !== lead.personId && c.order <= B.sharedFilmOrder && c.hasPhoto && free(c.personId),
      );
      const members: Member[] = [lead_];
      for (const coStar of shuffled(coStars, random)) {
        const films = await source.personFilms(coStar.personId);
        if (!isWellKnownActor(films, votes) || members.some((m) => knownTogether(m.films, films))) continue;
        members.push({ personId: coStar.personId, films });
        if (members.length === size) return { filmId: sharedFilm.tmdbId, members };
      }
    }
  }
  return null;
}

async function attempt(
  layout: readonly number[],
  source: BoardSource,
  random: () => number,
  votes: VoteThresholds,
  options: BuildOptions,
): Promise<(BuiltBoard & { pairRoute: boolean }) | null> {
  const avoidPeople = options.avoidPeople ?? new Set<number>();
  const avoidFilms = options.avoidFilms ?? new Set<number>();
  const used = new Set<number>();
  const free = (personId: number) => !used.has(personId) && !avoidPeople.has(personId);
  const films = shuffled(await source.mostVotedFilms(B.leadFilmRank), random);
  const leadFilms: LeadFilms = { next: () => films.shift() };

  const chosen: Member[] = [];
  const groups: { filmId: number; from: number; size: number }[] = [];
  // The biggest groups are the hardest to find, so they get the first pick of actors.
  for (const size of [...layout].sort((a, b) => b - a)) {
    const group = await findGroup(size, source, random, votes, leadFilms, free, avoidFilms);
    if (!group) return null;
    groups.push({ filmId: group.filmId, from: chosen.length, size });
    for (const m of group.members) used.add(m.personId);
    chosen.push(...group.members);
  }

  // No shortcut: clearing the board must take a film per group, counting every film anyone is in.
  const fewest = fewestFilmsToClear(
    chosen.map((c) => c.films.map((f) => f.tmdbId)),
    RULES.castingCall.maxGuesses,
  );
  if (fewest < groups.length) return null;

  // Shuffle the faces so the board's layout says nothing about who goes with whom.
  const order = shuffled(
    chosen.map((_, i) => i),
    random,
  );
  const position = new Map(order.map((from, to) => [from, to]));
  return {
    pairRoute: hasPairRoute(chosen.map((c) => c.films)),
    personIds: order.map((from) => chosen[from].personId),
    groups: groups.map(({ filmId, from, size }) => ({
      filmId,
      faces: Array.from({ length: size }, (_, k) => position.get(from + k)!).sort((a, b) => a - b),
    })),
  };
}

/**
 * Whether the faces can also be split into pairs that each share an on-screen
 * film where both are billed high, so a board with trios has a second,
 * longer route: the player who doesn't spot a trio can still clear it in pairs.
 */
export function hasPairRoute(filmsByFace: readonly (readonly FilmCredit[])[]): boolean {
  const billed = filmsByFace.map(
    (films) => new Set(films.filter((c) => isRole(c) && c.order <= B.sharedFilmOrder).map((c) => c.tmdbId)),
  );
  const together = (a: number, b: number) => [...billed[a]].some((film) => billed[b].has(film));
  const pairUp = (left: number[]): boolean => {
    if (left.length === 0) return true;
    const [first, ...rest] = left;
    return rest.some((other, i) => together(first, other) && pairUp(rest.filter((_, k) => k !== i)));
  };
  return filmsByFace.length % 2 === 0 && pairUp(filmsByFace.map((_, i) => i));
}

/** The day's layout, picked by weight; the others follow as fallbacks. */
export function layoutsInOrder(random: () => number): (readonly number[])[] {
  const layouts = B.layouts;
  const total = layouts.reduce((sum, l) => sum + l.weight, 0);
  let roll = random() * total;
  const picked = layouts.find((l) => (roll -= l.weight) < 0) ?? layouts[0];
  return [picked, ...layouts.filter((l) => l !== picked)].map((l) => l.groups);
}

/** Builds a board, the same one for the same seed and TMDB data. */
export async function buildBoard(source: BoardSource, options: BuildOptions): Promise<BuiltBoard> {
  for (const layout of B.layouts) {
    if (layout.groups.reduce((a, b) => a + b, 0) !== RULES.castingCall.faceCount || layout.groups.some((g) => g < 2)) {
      throw new BoardBuildError(`Layout ${layout.groups.join("+")} must fill the board with groups of 2 or more.`);
    }
  }
  const random = seededRandom(options.seed);
  const votes = await voteThresholds(source);
  for (const layout of layoutsInOrder(random)) {
    let settle: BuiltBoard | null = null;
    for (let i = 0; i < ATTEMPTS; i++) {
      const built = await attempt(layout, source, random, votes, options);
      if (!built) continue;
      const { pairRoute, ...board } = built;
      // A board with a trio is best when it can also be cleared in pairs; otherwise keep it in reserve.
      if (pairRoute || layout.every((size) => size === 2)) return board;
      settle ??= board;
    }
    if (settle) return settle;
  }
  throw new BoardBuildError(`No board could be built for seed ${options.seed}.`);
}
