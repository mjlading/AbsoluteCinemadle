import "server-only";

import { z } from "zod";

import { and, eq, gte, lte, ne } from "drizzle-orm";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import { prototypeBoards } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { isWellKnownActor } from "@/lib/casting-call/generate";
import { getPrototypeBoard, getOrBuildPrototypeBoard, type BoardSpec } from "@/lib/prototypes/boards";
import { seededRandom } from "@/lib/random";
import { getMostVotedFilms } from "@/lib/tmdb/cached";
import {
  checkFit,
  criterionKey,
  CriterionSchema,
  deepCutCandidates,
  PROMPT_KINDS,
  type Candidate,
  type Criterion,
} from "./criteria";
import { pickKinds } from "./pick";
import { fame, fameForScore } from "./rarity";
import { ANIMATION_GENRE, GENRES, THEMES, TV_MOVIE_GENRE } from "./themes";
import { discoverFilms, getFilmPeople, getFilmRecord, getPersonFilms } from "./tmdb";

/*
 * Builds a day's Deep Cut board: RULES.deepCut.rounds prompts of different kinds
 * (an actor, a director, a genre and decade, a theme), each with what checking
 * and scoring an answer needs: the criterion, the fame of the films that fit (for
 * the rarity scale), the most obvious answer and one deep-cut example. The
 * fitting films themselves are not kept; a player's film is checked against the
 * criterion from its own TMDB record.
 */

const B = RULES.deepCut.board;

const FilmRefSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string(),
  year: z.number().int().nullable(),
  voteCount: z.number().int().nonnegative(),
});
type FilmRef = z.infer<typeof FilmRefSchema>;

const PromptSchema = z.object({
  text: z.string(),
  criterion: CriterionSchema,
  scale: z.object({
    top: z.number().nonnegative(),
    fames: z.array(z.number().nonnegative()),
    total: z.number().int().nonnegative(),
  }),
  mostObvious: FilmRefSchema,
  deepCut: FilmRefSchema,
});
export type DeepCutPrompt = z.infer<typeof PromptSchema>;

const BoardDataSchema = z.object({ prompts: z.array(PromptSchema).length(RULES.deepCut.rounds) });

const ref = (c: Candidate): FilmRef => ({ tmdbId: c.tmdbId, title: c.title, year: c.year, voteCount: c.voteCount });
const pickOne = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];

/** The first deep-cut candidate that really fits by its own record (and isn't a short). */
async function firstFitting(criterion: Criterion, candidates: readonly Candidate[]): Promise<Candidate | null> {
  for (const c of candidates.slice(0, 8)) {
    if (checkFit(criterion, await getFilmRecord(c.tmdbId)).fits) return c;
  }
  return null;
}

async function withoutShorts(films: readonly Candidate[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (let i = 0; i < films.length; i += 10) {
    const batch = films.slice(i, i + 10);
    const records = await Promise.all(batch.map((f) => getFilmRecord(f.tmdbId)));
    batch.forEach((f, j) => {
      const runtime = records[j].runtime;
      if (runtime === 0 || runtime >= B.minRuntime) out.push(f);
    });
  }
  return out;
}

async function candidateFilms(): Promise<number[]> {
  const pages = Math.ceil(B.candidateFilmRank / 20);
  const lists = await Promise.all(Array.from({ length: pages }, (_, i) => getMostVotedFilms(i + 1)));
  return lists.flat().map((f) => f.tmdbId);
}

async function votesAtRank(rank: number): Promise<number> {
  const page = await getMostVotedFilms(Math.ceil(rank / 20));
  return page[(rank - 1) % 20]?.voteCount ?? page.at(-1)?.voteCount ?? 0;
}

/** A prompt about one person's films, from their credits, or null when they don't make a good prompt. */
async function personPrompt(
  kind: "actor" | "director",
  personId: number,
  wellKnownVotes: number,
  latestYear: number,
): Promise<DeepCutPrompt | null> {
  const person = await getPersonFilms(personId);
  const credited = kind === "actor" ? person.acted : person.directed;
  const minFilms = kind === "actor" ? B.actorMinFilms : B.directorMinFilms;
  const enough = (list: readonly Candidate[]) => list.filter((f) => f.voteCount >= B.realFilmVotes).length >= minFilms;
  if (!enough(credited)) return null;
  if (
    kind === "actor" &&
    !isWellKnownActor(person.castCredits, { wellKnown: wellKnownVotes, sharedMin: 0, sharedMax: 0 })
  ) {
    return null;
  }
  // Credits don't give runtimes: look up the films on the scale and drop the shorts (directors often start with some).
  const films = await withoutShorts(credited.filter((f) => f.voteCount >= B.voteFloor));
  if (!enough(films)) return null;

  const billed = kind === "actor" ? films.filter((f) => (f.order ?? 0) <= B.obviousBillingOrder) : films;
  const obvious = [...billed].sort((a, b) => b.voteCount - a.voteCount)[0];
  if (!obvious) return null;
  const criterion: Criterion = { kind, personId };
  const deepCut = await firstFitting(
    criterion,
    deepCutCandidates(films, { allowAnimation: false, top: obvious.voteCount, latestYear }),
  );
  if (!deepCut) return null;
  const fames = films
    .map((f) => fame(f))
    .filter((v) => v >= B.voteFloor)
    .sort((a, b) => b - a);
  return {
    text: kind === "actor" ? `A film with ${person.name}` : `A film directed by ${person.name}`,
    criterion,
    scale: { top: fame(obvious), fames, total: fames.length },
    mostObvious: ref(obvious),
    deepCut: ref(deepCut),
  };
}

/** A prompt whose fitting films TMDB's discovery lists, or null when the set is too small. */
async function discoverPrompt(
  text: string,
  criterion: Criterion,
  params: Record<string, string>,
  minFilms: number,
  minTopVotes: number,
  latestYear: number,
): Promise<DeepCutPrompt | null> {
  const list = { ...params, sort_by: "vote_count.desc", "vote_count.gte": String(B.voteFloor) };
  const first = await discoverFilms(list, 1);
  const top = first.films[0];
  if (first.total < minFilms || !top || top.voteCount < minTopVotes) return null;
  const rest = await Promise.all(
    Array.from({ length: Math.min(B.setPages, first.pages) - 1 }, (_, i) => discoverFilms(list, i + 2)),
  );
  const fames = [first, ...rest].flatMap((p) => p.films.map((f) => fame(f))).sort((a, b) => b - a);

  const animation = criterion.kind === "genreDecade" && criterion.genreId === ANIMATION_GENRE;
  const band = await discoverFilms({
    ...params,
    sort_by: "vote_average.desc",
    "vote_count.gte": String(B.deepCut.minVotes),
    "vote_count.lte": String(fameForScore(B.deepCut.minScore, top.voteCount)),
    without_genres: [animation ? null : ANIMATION_GENRE, TV_MOVIE_GENRE].filter(Boolean).join(","),
  });
  // Fall back on the least known of the films read for the scale.
  const read = [first, ...rest].flatMap((p) => p.films);
  const deepCut = await firstFitting(
    criterion,
    deepCutCandidates([...band.films, ...read], { allowAnimation: animation, top: top.voteCount, latestYear }),
  );
  if (!deepCut) return null;
  return {
    text,
    criterion,
    scale: { top: fame(top), fames, total: first.total },
    mostObvious: ref(top),
    deepCut: ref(deepCut),
  };
}

/** Criteria already taken, by `criterionKey`: on this board or on boards of nearby days. */
type KindBuilder = (random: () => number, used: Set<string>) => Promise<DeepCutPrompt | null>;

function builders(latestYear: number): Record<Criterion["kind"], KindBuilder> {
  let pool: Promise<number[]> | null = null;
  let wellKnown: Promise<number> | null = null;
  const person = (kind: "actor" | "director"): KindBuilder => {
    return async (random, used) => {
      pool ??= candidateFilms();
      wellKnown ??= votesAtRank(RULES.castingCall.board.wellKnownRank);
      const film = pickOne(await pool, random);
      const people = await getFilmPeople(film);
      const options = (kind === "actor" ? people.leads : people.directors).filter(
        (personId) => !used.has(criterionKey({ kind, personId })),
      );
      if (options.length === 0) return null;
      const criterion = { kind, personId: pickOne(options, random) };
      used.add(criterionKey(criterion));
      return personPrompt(kind, criterion.personId, await wellKnown, latestYear);
    };
  };
  return {
    actor: person("actor"),
    director: person("director"),
    genreDecade: async (random, used) => {
      const genre = pickOne(GENRES, random);
      const decade = pickOne(B.decades, random);
      const criterion: Criterion = { kind: "genreDecade", genreId: genre.id, from: decade, to: decade + 9 };
      if (used.has(criterionKey(criterion))) return null;
      used.add(criterionKey(criterion));
      return discoverPrompt(
        `${genre.name} from the ${decade}s`,
        criterion,
        {
          with_genres: String(genre.id),
          "primary_release_date.gte": `${decade}-01-01`,
          "primary_release_date.lte": `${decade + 9}-12-31`,
        },
        B.genreMinFilms,
        B.genreTopVotes,
        latestYear,
      );
    },
    theme: async (random, used) => {
      const theme = pickOne(THEMES, random);
      const criterion: Criterion = { kind: "theme", keywordIds: theme.keywordIds };
      if (used.has(criterionKey(criterion))) return null;
      used.add(criterionKey(criterion));
      return discoverPrompt(
        theme.text,
        criterion,
        { with_keywords: theme.keywordIds.join("|") },
        B.themeMinFilms,
        0,
        latestYear,
      );
    },
  };
}

export class DeepCutBuildError extends Error {}

/** The criteria on the stored boards of the days around `date`, so a board doesn't repeat its neighbours. */
async function nearbyCriteria(date: string): Promise<Set<string>> {
  const rows = await db()
    .select({ data: prototypeBoards.data })
    .from(prototypeBoards)
    .where(
      and(
        eq(prototypeBoards.game, DEEP_CUT_SPEC.game),
        gte(prototypeBoards.date, addDays(date, -B.repeatWindowDays)),
        lte(prototypeBoards.date, addDays(date, B.repeatWindowDays)),
        ne(prototypeBoards.date, date),
      ),
    );
  const keys = new Set<string>();
  for (const row of rows) {
    const parsed = BoardDataSchema.safeParse(row.data);
    if (parsed.success) for (const p of parsed.data.prompts) keys.add(criterionKey(p.criterion));
  }
  return keys;
}

async function build(seed: string, date: string): Promise<z.infer<typeof BoardDataSchema>> {
  const random = seededRandom(seed);
  const kinds = pickKinds(PROMPT_KINDS, RULES.deepCut.rounds, random);
  const make = builders(Number(date.slice(0, 4)) - B.deepCutMinAgeYears);
  const used = await nearbyCriteria(date);
  const prompts: DeepCutPrompt[] = [];
  for (const kind of kinds) {
    let prompt: DeepCutPrompt | null = null;
    for (let attempt = 0; attempt < B.attempts && !prompt; attempt++) prompt = await make[kind](random, used);
    if (!prompt) throw new DeepCutBuildError(`No ${kind} prompt could be built for ${seed}.`);
    prompts.push(prompt);
  }
  return { prompts };
}

export const DEEP_CUT_SPEC: BoardSpec<typeof BoardDataSchema> = {
  game: "deep-cut",
  version: 6,
  schema: BoardDataSchema,
  build,
};

export const getDeepCutBoardByDate = (date: string) => getOrBuildPrototypeBoard(DEEP_CUT_SPEC, date);
export const getDeepCutBoard = (id: string) => getPrototypeBoard(DEEP_CUT_SPEC, id);
