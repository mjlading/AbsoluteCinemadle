import { RULES } from "@/config/rules";
import { seededRandom } from "@/lib/random";
import { ageOn, isFullDate } from "./scoring";

/*
 * Builds a day's How Old Were They? board. Lead actors are gathered from
 * well-known films of mixed eras; each actor's own filmography then gives
 * (actor, film) pairs where they were billed near the top of a well-known
 * film. Pairs are bucketed by the actor's age then, and the board draws its
 * rounds from different age bands and decades, favouring roles far from the
 * middle of the actor's career (child parts, late parts, early parts).
 *
 * It only sees TMDB through `HowOldSource`, so it can be tested without the network.
 */

const B = RULES.howOld.board;
/** Animation and documentary (no visible face, or no role), and TV films. */
const LEFT_OUT_GENRES = new Set([16, 99, 10770]);
/** Playing themselves, archive footage, or an unnamed walk-on: not a role to guess an age for. */
const NOT_A_ROLE = /\b(self|himself|herself|themselves|archive|uncredited|voice)\b/i;

export interface FilmCredit {
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
  voteCount: number;
  /** Billing position, from 0. */
  order: number;
  genreIds: number[];
  character: string;
  video: boolean;
}

export interface PersonDetails {
  personId: number;
  name: string;
  birthday: string | null;
  deathday: string | null;
  films: FilmCredit[];
}

export interface HowOldSource {
  /** A decade's most-voted films (animation and documentaries left out), by id, most first. */
  decadeFilms(from: number, count: number): Promise<number[]>;
  /** The vote count of the film at this rank among all films (1 is the most voted), now. */
  votesAtRank(rank: number): Promise<number>;
  /** A film's cast, by billing order. */
  filmLeads(tmdbId: number): Promise<{ personId: number; order: number }[]>;
  person(personId: number): Promise<PersonDetails>;
}

export interface HowOldRound {
  personId: number;
  actor: string;
  filmId: number;
  title: string;
  character: string;
  posterPath: string;
  birthday: string;
  releaseDate: string;
  age: number;
}

export interface Candidate extends HowOldRound {
  band: number;
  decade: number;
  /** Relative chance of being drawn within its band. */
  weight: number;
}

export class HowOldBuildError extends Error {}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function weightedIndex(weights: readonly number[], random: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0 && weights[i] > 0) return i;
  }
  return weights.findLastIndex((w) => w > 0);
}

export const bandOf = (age: number) => B.ageBands.findIndex((b) => age < b.below);

/** A credit that is an on-screen role in a proper, released film with full dates and a poster. */
function isPlayableRole(c: FilmCredit, date: string): c is FilmCredit & { releaseDate: string; posterPath: string } {
  return (
    !c.video &&
    isFullDate(c.releaseDate) &&
    c.releaseDate <= date &&
    c.posterPath !== null &&
    c.character.trim() !== "" &&
    !NOT_A_ROLE.test(c.character) &&
    !c.genreIds.some((g) => LEFT_OUT_GENRES.has(g))
  );
}

/** True for an actor with enough leading roles in well-known films. */
export function isWellKnown(person: PersonDetails, fameVotes: number, date: string): boolean {
  const roles = new Set(
    person.films
      .filter((c) => isPlayableRole(c, date) && c.order <= B.fameOrder && c.voteCount >= fameVotes)
      .map((c) => c.tmdbId),
  );
  return roles.size >= B.fameRoles;
}

/** Every (actor, film) pair this person gives: a lead role in a well-known film, with a known age. */
export function candidatesFor(person: PersonDetails, filmVotes: number, date: string): Candidate[] {
  if (!isFullDate(person.birthday)) return [];
  const birthday = person.birthday;
  const leads = person.films.filter(
    (c): c is FilmCredit & { releaseDate: string; posterPath: string } =>
      isPlayableRole(c, date) &&
      c.order <= B.leadOrder &&
      c.voteCount >= filmVotes &&
      // Billed after their death: archive footage or a posthumous release, not a role played at that age.
      (!isFullDate(person.deathday) || c.releaseDate <= person.deathday),
  );
  const unique = [...new Map(leads.map((c) => [c.tmdbId, c])).values()];
  if (unique.length === 0) return [];
  // The middle of their well-known career; roles far from it make the surprising rounds.
  const years = unique.map((c) => Number(c.releaseDate.slice(0, 4))).sort((a, b) => a - b);
  const median = years[Math.floor(years.length / 2)];
  return unique.flatMap((c) => {
    const age = ageOn(birthday, c.releaseDate);
    if (age < RULES.howOld.minAge || age > RULES.howOld.maxAge) return [];
    const year = Number(c.releaseDate.slice(0, 4));
    return [
      {
        personId: person.personId,
        actor: person.name,
        filmId: c.tmdbId,
        title: c.title,
        character: c.character.trim(),
        posterPath: c.posterPath,
        birthday,
        releaseDate: c.releaseDate,
        age,
        band: bandOf(age),
        decade: Math.floor(year / 10) * 10,
        weight: 1 + Math.abs(year - median) / B.surpriseYears,
      },
    ];
  });
}

/**
 * The age bands a board's rounds are drawn from, in drawing order: by weight,
 * at most `maxPerBand` of one band and at least `minBands` different ones.
 */
export function planBands(random: () => number, rounds: number = RULES.howOld.rounds): number[] {
  const counts = B.ageBands.map(() => 0);
  const plan: number[] = [];
  for (let i = 0; i < rounds; i++) {
    const distinct = counts.filter((c) => c > 0).length;
    const mustBeNew = distinct + (rounds - i) <= Math.min(B.minBands, B.ageBands.length);
    const weights = B.ageBands.map((b, band) =>
      counts[band] >= B.maxPerBand || (mustBeNew && counts[band] > 0) ? 0 : b.weight,
    );
    const band = weightedIndex(weights, random);
    counts[band]++;
    plan.push(band);
  }
  // The rarest bands draw first, so the common ones can't use up their actors and films.
  return plan.sort((a, b) => a - b);
}

/**
 * Picks the rounds from the candidates following the band plan, with no actor
 * or film twice and at most `maxPerDecade` from a decade. A band that has
 * nothing left gives way to whichever band still has a fitting candidate.
 */
export function pickRounds(
  candidates: readonly Candidate[],
  plan: readonly number[],
  random: () => number,
): Candidate[] {
  const picked: Candidate[] = [];
  const fits = (c: Candidate) =>
    !picked.some((p) => p.personId === c.personId || p.filmId === c.filmId) &&
    picked.filter((p) => p.decade === c.decade).length < B.maxPerDecade;
  const draw = (pool: Candidate[]) => {
    const i = weightedIndex(
      pool.map((c) => c.weight),
      random,
    );
    return i >= 0 ? pool[i] : undefined;
  };
  for (const band of plan) {
    let choice = draw(candidates.filter((c) => c.band === band && fits(c)));
    if (!choice) {
      const usedBands = new Set(picked.map((p) => p.band));
      const pool = candidates.filter((c) => fits(c));
      choice = draw(pool.filter((c) => !usedBands.has(c.band))) ?? draw(pool);
    }
    if (choice) picked.push(choice);
  }
  return picked;
}

/** Seed films, drawn decade by decade by weight, no film twice. */
async function seedFilms(source: HowOldSource, random: () => number): Promise<number[]> {
  const pools = await Promise.all(B.decades.map((d) => source.decadeFilms(d.from, B.filmsPerDecade)));
  const left = pools.map((p) => shuffled(p, random));
  const seen = new Set<number>();
  const out: number[] = [];
  while (out.length < B.seedFilms) {
    const i = weightedIndex(
      B.decades.map((d, k) => (left[k].length > 0 ? d.weight : 0)),
      random,
    );
    if (i < 0) break;
    const film = left[i].pop()!;
    if (!seen.has(film)) {
      seen.add(film);
      out.push(film);
    }
  }
  return out;
}

export interface Avoid {
  /** Actors and films on nearby days' boards, left out when the board can do without them. */
  people: ReadonlySet<number>;
  films: ReadonlySet<number>;
}

/** Builds the board's rounds, in play order. */
export async function buildRounds(
  source: HowOldSource,
  seed: string,
  date: string,
  avoid: Avoid = { people: new Set(), films: new Set() },
): Promise<HowOldRound[]> {
  const random = seededRandom(seed);
  const rounds = RULES.howOld.rounds;
  const [fameVotes, filmVotes, films] = await Promise.all([
    source.votesAtRank(B.fameRank),
    source.votesAtRank(B.filmRank),
    seedFilms(source, random),
  ]);
  const casts = await Promise.all(films.map((id) => source.filmLeads(id)));
  const personIds = [
    ...new Set(casts.flatMap((cast) => cast.filter((c) => c.order <= B.leadOrder).map((c) => c.personId))),
  ];
  const people = await Promise.all(personIds.map((id) => source.person(id)));
  const candidates = people
    .filter((p) => isWellKnown(p, fameVotes, date))
    .flatMap((p) => candidatesFor(p, filmVotes, date));
  const plan = planBands(random, rounds);
  const fresh = candidates.filter((c) => !avoid.people.has(c.personId) && !avoid.films.has(c.filmId));
  let picked = pickRounds(fresh, plan, random);
  if (picked.length < rounds) picked = pickRounds(candidates, plan, random);
  if (picked.length < rounds) {
    throw new HowOldBuildError(`Only ${picked.length} of ${rounds} rounds could be found for ${date}.`);
  }
  return shuffled(picked, random).map((c): HowOldRound => ({
    personId: c.personId,
    actor: c.actor,
    filmId: c.filmId,
    title: c.title,
    character: c.character,
    posterPath: c.posterPath,
    birthday: c.birthday,
    releaseDate: c.releaseDate,
    age: c.age,
  }));
}
