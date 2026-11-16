import "server-only";

import { randomBytes } from "node:crypto";

import { and, asc, desc, eq, gte, lt, lte } from "drizzle-orm";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import { ratingsCliffBoards } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { RatingsCliffBoardSchema } from "./board-schema";
import { buildRatingsCliffBoard } from "./build";
import { getSeasonEpisodes } from "./tmdb";
import type { RatingsCliffDay, RatingsCliffRound } from "./types";

/*
 * Ratings Cliff's daily boards live in the ratings_cliff_boards table, one per
 * date. Nobody makes them by hand: the daily cron job builds the coming week's
 * (src/app/api/cron/daily), and a player who reaches a day without one gets it
 * built on the spot, so a missed cron run never leaves a day empty.
 */

export interface RatingsCliffBoard {
  id: string;
  date: string;
  rounds: RatingsCliffRound[];
}

/** TMDB data may be kept 6 months; boards are refreshed a month before that. */
const REFRESH_AFTER_DAYS = 150;

const toBoard = (row: typeof ratingsCliffBoards.$inferSelect): RatingsCliffBoard => RatingsCliffBoardSchema.parse(row);

export async function getBoard(id: string): Promise<RatingsCliffBoard | null> {
  const [row] = await db().select().from(ratingsCliffBoards).where(eq(ratingsCliffBoards.id, id));
  return row ? toBoard(row) : null;
}

export async function getBoardByDate(date: string): Promise<RatingsCliffBoard | null> {
  const [row] = await db().select().from(ratingsCliffBoards).where(eq(ratingsCliffBoards.date, date));
  return row ? toBoard(row) : null;
}

/** The days from `from` to `to` (YYYY-MM-DD, both included) that have no board yet, in date order. */
export async function datesWithoutBoards(from: string, to: string): Promise<string[]> {
  const rows = await db()
    .select({ date: ratingsCliffBoards.date })
    .from(ratingsCliffBoards)
    .where(and(gte(ratingsCliffBoards.date, from), lte(ratingsCliffBoards.date, to)));
  const have = new Set(rows.map((r) => r.date));
  const missing: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) if (!have.has(date)) missing.push(date);
  return missing;
}

/** Every day with a board, newest first, up to and including `latest`. */
export async function listRatingsCliffDays(latest: string): Promise<RatingsCliffDay[]> {
  return db()
    .select({ id: ratingsCliffBoards.id, date: ratingsCliffBoards.date })
    .from(ratingsCliffBoards)
    .where(lte(ratingsCliffBoards.date, latest))
    .orderBy(desc(ratingsCliffBoards.date));
}

// Players arriving together at a day without a board share one build per server instance.
const building = new Map<string, Promise<RatingsCliffBoard>>();

/** The board for a date, built and stored first if there is none yet. */
export function getOrBuildBoard(date: string): Promise<RatingsCliffBoard> {
  let pending = building.get(date);
  if (!pending) {
    pending = (async () => {
      const existing = await getBoardByDate(date);
      if (existing) return existing;
      // RATINGS_CLIFF_SEED re-rolls boards not built yet, which are otherwise the same for a date.
      const seed = `ratings-cliff:${process.env.RATINGS_CLIFF_SEED ?? ""}${date}`;
      const rounds = await buildRatingsCliffBoard(seed, date);
      const id = randomBytes(6).toString("base64url");
      RatingsCliffBoardSchema.parse({ id, date, rounds });
      // Another server instance may have stored one meanwhile; the first one stored wins.
      await db()
        .insert(ratingsCliffBoards)
        .values({ id, date, rounds })
        .onConflictDoNothing({ target: ratingsCliffBoards.date });
      return (await getBoardByDate(date))!;
    })().finally(() => building.delete(date));
    building.set(date, pending);
  }
  return pending;
}

/**
 * Re-fetches the episode ratings on boards whose TMDB data is getting old and dates them again.
 * The answers and options stay; only the charts' numbers move with TMDB's. A board whose series
 * TMDB no longer has is deleted.
 */
export async function refreshStaleBoards(limit: number, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - REFRESH_AFTER_DAYS * 86_400_000);
  const stale = await db()
    .select()
    .from(ratingsCliffBoards)
    .where(lt(ratingsCliffBoards.syncedAt, cutoff))
    .orderBy(asc(ratingsCliffBoards.syncedAt))
    .limit(limit);
  const minVotes = RULES.ratingsCliff.board.episodeMinVotes;
  for (const row of stale) {
    try {
      const rounds = await Promise.all(
        row.rounds.map(async (round) => {
          const seasons = await Promise.all(
            round.seasons.map(async (season) => {
              const fresh = new Map(
                (await getSeasonEpisodes(round.seriesId, season.number)).map((e) => [e.episode, e]),
              );
              return {
                number: season.number,
                episodes: season.episodes.map((e) => {
                  const now = fresh.get(e.episode);
                  return now && now.voteCount >= minVotes
                    ? { episode: e.episode, rating: Math.round(now.voteAverage * 10) / 10, votes: now.voteCount }
                    : e;
                }),
              };
            }),
          );
          return { ...round, seasons };
        }),
      );
      await db().update(ratingsCliffBoards).set({ rounds, syncedAt: now }).where(eq(ratingsCliffBoards.id, row.id));
    } catch (error) {
      if (String(error).includes("answered 404")) {
        await db().delete(ratingsCliffBoards).where(eq(ratingsCliffBoards.id, row.id));
      }
      // Any other failure (TMDB down, rate limits) leaves the row for the next run.
    }
  }
  return stale.length;
}
