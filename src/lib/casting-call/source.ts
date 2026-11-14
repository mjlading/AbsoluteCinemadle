import "server-only";

import { randomBytes } from "node:crypto";

import { and, asc, desc, eq, gte, lt, lte } from "drizzle-orm";
import { z } from "zod";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import { castingCallBoards } from "@/db/schema";
import { addDays, utcIsoDate } from "@/lib/dates";
import { getPerson } from "@/lib/tmdb/api";
import { getMostVotedFilms, getMovieWithCast, getPersonFilmCredits } from "@/lib/tmdb/cached";
import { buildBoard, type BoardSource } from "./generate";
import type { CastingCallDay } from "./types";

/*
 * Casting call's daily boards live in the casting_call_boards table, one per
 * date. Nobody makes them by hand: the daily cron job builds the coming week's
 * (src/app/api/cron/casting-call), and a player who reaches a day without one
 * gets it built on the spot, so a missed cron run never leaves a day empty.
 */

export interface CastingCallBoard {
  id: string;
  date: string;
  /** Exactly RULES.castingCall.faceCount ids; a face's id is its position here. */
  personIds: number[];
  pairs: { filmId: number; faces: [number, number] }[];
}

const FACES = RULES.castingCall.faceCount;
const BoardRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  personIds: z.array(z.number().int().positive()).length(FACES),
  pairs: z.array(
    z.object({
      filmId: z.number().int().positive(),
      faces: z.tuple([
        z
          .number()
          .int()
          .min(0)
          .max(FACES - 1),
        z
          .number()
          .int()
          .min(0)
          .max(FACES - 1),
      ]),
    }),
  ),
});

/** Pages of 20 most-voted films that actors are found through: the 400 best-known films. */
const WELL_KNOWN_PAGES = 20;
/** TMDB data may be kept 6 months; rows are refreshed a month before that. */
const REFRESH_AFTER_DAYS = 150;

const toBoard = (row: typeof castingCallBoards.$inferSelect): CastingCallBoard => BoardRowSchema.parse(row);

export async function getBoard(id: string): Promise<CastingCallBoard | null> {
  const [row] = await db().select().from(castingCallBoards).where(eq(castingCallBoards.id, id));
  return row ? toBoard(row) : null;
}

export async function getBoardByDate(date: string): Promise<CastingCallBoard | null> {
  const [row] = await db().select().from(castingCallBoards).where(eq(castingCallBoards.date, date));
  return row ? toBoard(row) : null;
}

/** Every day with a board, newest first, up to and including `latest`. */
export async function listCastingCallDays(latest: string): Promise<CastingCallDay[]> {
  return db()
    .select({ id: castingCallBoards.id, date: castingCallBoards.date })
    .from(castingCallBoards)
    .where(lte(castingCallBoards.date, latest))
    .orderBy(desc(castingCallBoards.date));
}

/**
 * A board may be built on demand only for a day that is today somewhere on
 * Earth (UTC-12 to UTC+14), so nobody can fill the past or the far future.
 */
export function canBuildOnDemand(date: string, now: Date = new Date()): boolean {
  const today = utcIsoDate(now);
  return date >= addDays(today, -1) && date <= addDays(today, 1);
}

const tmdbSource: BoardSource = {
  async wellKnownFilms() {
    const pages = await Promise.all(Array.from({ length: WELL_KNOWN_PAGES }, (_, i) => getMostVotedFilms(i + 1)));
    return [...new Set(pages.flat())];
  },
  async filmCast(tmdbId) {
    const film = await getMovieWithCast(tmdbId);
    return film.cast.map((c) => ({ personId: c.personId, order: c.order, hasPhoto: c.profilePath !== null }));
  },
  personFilms: (personId) => getPersonFilmCredits(personId),
};

/** Actors and films on boards within the cooldown of a date, before or after it. */
async function nearbyUse(date: string) {
  const days = RULES.castingCall.board.cooldownDays;
  const rows = await db()
    .select({ personIds: castingCallBoards.personIds, pairs: castingCallBoards.pairs })
    .from(castingCallBoards)
    .where(and(gte(castingCallBoards.date, addDays(date, -days)), lte(castingCallBoards.date, addDays(date, days))));
  return {
    avoidPeople: new Set(rows.flatMap((r) => r.personIds)),
    avoidFilms: new Set(rows.flatMap((r) => r.pairs.map((p) => p.filmId))),
  };
}

// Players arriving together at a day without a board share one build per server instance.
const building = new Map<string, Promise<CastingCallBoard>>();

/** The board for a date, built and stored first if there is none yet. */
export function getOrBuildBoard(date: string): Promise<CastingCallBoard> {
  let pending = building.get(date);
  if (!pending) {
    pending = (async () => {
      const existing = await getBoardByDate(date);
      if (existing) return existing;
      const built = await buildBoard(tmdbSource, { seed: `casting-call:${date}`, ...(await nearbyUse(date)) });
      // Another server instance may have stored one meanwhile; the first one stored wins.
      await db()
        .insert(castingCallBoards)
        .values({ id: randomBytes(6).toString("base64url"), date, ...built })
        .onConflictDoNothing({ target: castingCallBoards.date });
      return (await getBoardByDate(date))!;
    })().finally(() => building.delete(date));
    building.set(date, pending);
  }
  return pending;
}

/**
 * Re-fetches the people on boards whose TMDB data is getting old, and dates
 * them again; a board whose people TMDB no longer knows is deleted instead.
 */
export async function refreshStaleBoards(limit: number, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - REFRESH_AFTER_DAYS * 86_400_000);
  const stale = await db()
    .select()
    .from(castingCallBoards)
    .where(lt(castingCallBoards.syncedAt, cutoff))
    .orderBy(asc(castingCallBoards.syncedAt))
    .limit(limit);
  for (const row of stale) {
    const found = await Promise.allSettled(row.personIds.map((id) => getPerson(id)));
    const failures = found.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
    if (failures.length === 0) {
      await db().update(castingCallBoards).set({ syncedAt: now }).where(eq(castingCallBoards.id, row.id));
    } else if (failures.some((f) => f.includes("answered 404"))) {
      await db().delete(castingCallBoards).where(eq(castingCallBoards.id, row.id));
    }
    // Any other failure (TMDB down, rate limits) leaves the row for the next run.
  }
  return stale.length;
}
