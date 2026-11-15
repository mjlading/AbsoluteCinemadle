import "server-only";

import { and, eq, gte, lte, ne } from "drizzle-orm";
import { z } from "zod";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import { prototypeBoards } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { errorResponse, parseJsonBody } from "@/lib/http";
import {
  getOrBuildPrototypeBoard,
  getPrototypeBoard,
  type BoardSpec,
  type PrototypeBoard,
} from "@/lib/prototypes/boards";
import { BoardImagesSchema, prototypeImageUrl } from "@/lib/prototypes/images";
import { buildRounds } from "./generate";
import { pointsFor } from "./scoring";
import { cachedSource } from "./source";
import type { HowOldReveal, PublicHowOldBoard } from "./types";

/*
 * How Old Were They?'s boards and request handling. A stored board holds every
 * answer (birthdays, release dates, ages); the client gets only the actor, the
 * film, the character and the poster's opaque address, and each guess comes
 * back with that one round's age, year and points.
 */

const GAME = "how-old";
const POSTER_SIZE = "w500";
const noStore = { "Cache-Control": "no-store" };

const RoundSchema = z.object({
  personId: z.number().int().positive(),
  actor: z.string(),
  filmId: z.number().int().positive(),
  title: z.string(),
  character: z.string(),
  birthday: z.string(),
  releaseDate: z.string(),
  age: z.number().int(),
});

const DataSchema = z.object({
  rounds: z.array(RoundSchema).length(RULES.howOld.rounds),
  /** Round i's poster is image String(i). */
  images: BoardImagesSchema,
});

type HowOldData = z.infer<typeof DataSchema>;
type HowOldBoard = PrototypeBoard<HowOldData>;

/** Actors and films on this game's stored boards within the cooldown of a date. */
async function nearbyUse(date: string) {
  const days = RULES.howOld.board.cooldownDays;
  const rows = await db()
    .select({ data: prototypeBoards.data })
    .from(prototypeBoards)
    .where(
      and(
        eq(prototypeBoards.game, GAME),
        ne(prototypeBoards.date, date),
        gte(prototypeBoards.date, addDays(date, -days)),
        lte(prototypeBoards.date, addDays(date, days)),
      ),
    );
  const rounds = rows.flatMap((r) => {
    const parsed = z.object({ rounds: z.array(RoundSchema) }).safeParse(r.data);
    return parsed.success ? parsed.data.rounds : [];
  });
  return { people: new Set(rounds.map((r) => r.personId)), films: new Set(rounds.map((r) => r.filmId)) };
}

export const howOldSpec: BoardSpec<typeof DataSchema> = {
  game: GAME,
  version: 1,
  schema: DataSchema,
  async build(seed, date) {
    const rounds = await buildRounds(cachedSource, seed, date, await nearbyUse(date));
    return {
      // The schema drops each round's poster path; the client gets the poster by its image id only.
      rounds,
      images: Object.fromEntries(rounds.map((r, i) => [String(i), { path: r.posterPath, size: POSTER_SIZE }])),
    };
  },
};

const yearOf = (releaseDate: string) => Number(releaseDate.slice(0, 4));

export async function dayResponse(date: string): Promise<Response> {
  try {
    const board = await getOrBuildPrototypeBoard(howOldSpec, date);
    if (!board) return errorResponse(404, "There is no How Old Were They? for that day.");
    const body: PublicHowOldBoard = {
      id: board.id,
      date: board.date,
      rounds: board.data.rounds.map((r, i) => ({
        actor: r.actor,
        title: r.title,
        character: r.character,
        posterUrl: prototypeImageUrl(board.id, String(i)),
        ...(RULES.howOld.hideYear ? {} : { year: yearOf(r.releaseDate) }),
      })),
    };
    return Response.json(body, { headers: noStore });
  } catch (error) {
    console.error(`How Old board for ${date} could not be built`, error);
    return errorResponse(502, "Today's board couldn't be made right now.");
  }
}

const GuessBody = z.object({
  round: z
    .number()
    .int()
    .min(0)
    .max(RULES.howOld.rounds - 1),
  age: z.number().int().min(RULES.howOld.minAge).max(RULES.howOld.maxAge),
});

/** Checks one round's guess and reveals that round only. */
export async function guessResponse(boardId: string, request: Request): Promise<Response> {
  const board: HowOldBoard | null = await getPrototypeBoard(howOldSpec, boardId);
  if (!board) return errorResponse(404, "There is no such board.");
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const round = board.data.rounds[body.round];
  const reveal: HowOldReveal = {
    age: round.age,
    year: yearOf(round.releaseDate),
    points: pointsFor(body.age, round.age),
  };
  return Response.json(reveal, { headers: noStore });
}
