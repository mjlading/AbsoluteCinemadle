import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { getOrBuildPrototypeBoard, getPrototypeBoard, type BoardSpec } from "@/lib/prototypes/boards";
import { BoardImagesSchema } from "@/lib/prototypes/images";
import { seededRandom } from "@/lib/random";
import { tmdb } from "@/lib/tmdb/api";
import { pickBackdrop, pickDecades, shuffle, type Decade, type Rand } from "./pick";

/*
 * A Carbon Dating board: five stills from five well-known live-action films,
 * each from a different decade, with the film's title and release year kept
 * here until the player has guessed. Built from TMDB on a day's first request.
 */

const BoardDataSchema = z.object({
  rounds: z.array(z.object({ tmdbId: z.number().int(), title: z.string(), year: z.number().int() })).min(1),
  images: BoardImagesSchema,
});
export type CarbonBoardData = z.infer<typeof BoardDataSchema>;

const DiscoverSchema = z.object({
  total_pages: z.number(),
  results: z.array(z.object({ id: z.number(), title: z.string(), release_date: z.string().nullish() })),
});

const ImagesSchema = z.object({
  backdrops: z.array(
    z.object({
      file_path: z.string(),
      width: z.number(),
      height: z.number(),
      vote_average: z.number().default(0),
      vote_count: z.number().default(0),
    }),
  ),
});

/** TMDB serves at most 500 pages of a discover list. */
const MAX_PAGE = 500;

function discover(decade: Decade, lastDay: string, page: number) {
  const end = `${decade.from + 9}-12-31`;
  return tmdb("/discover/movie", DiscoverSchema, {
    "primary_release_date.gte": `${decade.from}-01-01`,
    "primary_release_date.lte": end < lastDay ? end : lastDay,
    "vote_count.gte": String(decade.minVotes),
    "with_runtime.gte": String(RULES.carbonDating.minRuntime),
    without_genres: RULES.carbonDating.excludedGenres.join(","),
    include_adult: "false",
    include_video: "false",
    sort_by: "vote_count.desc",
    language: "en-US",
    page: String(page),
  });
}

type Round = CarbonBoardData["rounds"][number] & { path: string };

/** One film of the decade with a usable still, or null when none of the tries has one. */
async function pickRound(rand: Rand, decade: Decade, lastDay: string, used: Set<number>): Promise<Round | null> {
  const first = await discover(decade, lastDay, 1);
  const pages = Math.min(first.total_pages, MAX_PAGE);
  if (pages === 0) return null;
  // Every film above the decade's floor is equally likely, so a big pool keeps nearby days apart.
  const page = 1 + Math.floor(rand() * pages);
  const { results } = page === 1 ? first : await discover(decade, lastDay, page);
  const candidates = shuffle(rand, results).filter((m) => !used.has(m.id));
  for (const film of candidates.slice(0, RULES.carbonDating.filmTries)) {
    const year = Number(film.release_date?.slice(0, 4));
    if (!Number.isInteger(year) || year < decade.from || year > decade.from + 9) continue;
    const { backdrops } = await tmdb(`/movie/${film.id}/images`, ImagesSchema, { include_image_language: "null" });
    const backdrop = pickBackdrop(rand, backdrops);
    if (backdrop) return { tmdbId: film.id, title: film.title, year, path: backdrop.file_path };
  }
  return null;
}

export async function buildCarbonBoard(seed: string, date: string): Promise<CarbonBoardData> {
  const rand = seededRandom(seed);
  const { rounds: count, decades } = RULES.carbonDating;
  // Every decade, shuffled: the first `count` that yield a film make the board; the rest stand by.
  const order = pickDecades(rand, decades, decades.length, Number(date.slice(0, 4)));
  const used = new Set<number>();
  const rounds: Round[] = [];
  for (const decade of order) {
    if (rounds.length === count) break;
    const round = await pickRound(rand, decade, date, used);
    if (!round) continue;
    used.add(round.tmdbId);
    rounds.push(round);
  }
  if (rounds.length < count) throw new Error(`Carbon Dating found only ${rounds.length} films for ${date}`);
  return {
    rounds: rounds.map(({ tmdbId, title, year }) => ({ tmdbId, title, year })),
    images: Object.fromEntries(rounds.map((r, i) => [String(i), { path: r.path, size: "w1280" }])),
  };
}

const spec: BoardSpec<typeof BoardDataSchema> = {
  game: "carbon-dating",
  version: 2,
  schema: BoardDataSchema,
  build: buildCarbonBoard,
};

export const getCarbonBoardForDate = (date: string) => getOrBuildPrototypeBoard(spec, date);
export const getCarbonBoard = (id: string) => getPrototypeBoard(spec, id);
