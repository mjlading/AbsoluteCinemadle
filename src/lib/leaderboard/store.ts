import "server-only";

import { createHash } from "node:crypto";

import { and, count, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { leaderboardEntries, leaderboardPlayers } from "@/db/schema";
import {
  LEADERBOARD_GAMES,
  type AllTimeBoards,
  type AllTimeRow,
  type DailyEntry,
  type LeaderboardGame,
  type LeaderboardResult,
} from "./types";

/** Submissions one IP may make per hour; a group of friends behind one office router stays well under it. */
export const SUBMISSIONS_PER_HOUR = 60;
/** Rows in each all-time list. */
const ALL_TIME_ROWS = 50;

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** The sender's IP as Vercel passes it on, or "unknown" locally. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export type SubmitOutcome = "saved" | "name-taken" | "already-submitted" | "rate-limited";

/**
 * Records a replayed result under a name. The name belongs to the first token that used it;
 * a browser that played the day under one name can't post the same day again under another.
 */
export async function submitEntry(input: {
  game: LeaderboardGame;
  date: string;
  name: string;
  nameKey: string;
  token: string;
  ip: string;
  result: LeaderboardResult;
}): Promise<SubmitOutcome> {
  const tokenHash = sha256(input.token);
  const ipHash = sha256(`leaderboard:${input.ip}`);
  return db().transaction(async (tx) => {
    const [{ recent }] = await tx
      .select({ recent: count() })
      .from(leaderboardEntries)
      .where(
        and(eq(leaderboardEntries.ipHash, ipHash), gt(leaderboardEntries.createdAt, sql`now() - interval '1 hour'`)),
      );
    if (recent >= SUBMISSIONS_PER_HOUR) return "rate-limited";

    // Any name this token holds that already has the day: one result per browser per daily.
    const [sameDay] = await tx
      .select({ id: leaderboardEntries.id })
      .from(leaderboardEntries)
      .innerJoin(leaderboardPlayers, eq(leaderboardPlayers.id, leaderboardEntries.playerId))
      .where(
        and(
          eq(leaderboardPlayers.tokenHash, tokenHash),
          eq(leaderboardEntries.game, input.game),
          eq(leaderboardEntries.date, input.date),
        ),
      );
    if (sameDay) return "already-submitted";

    await tx
      .insert(leaderboardPlayers)
      .values({ name: input.name, nameKey: input.nameKey, tokenHash })
      .onConflictDoNothing({ target: leaderboardPlayers.nameKey });
    const [player] = await tx.select().from(leaderboardPlayers).where(eq(leaderboardPlayers.nameKey, input.nameKey));
    if (player.tokenHash !== tokenHash) return "name-taken";

    const inserted = await tx
      .insert(leaderboardEntries)
      .values({
        playerId: player.id,
        game: input.game,
        date: input.date,
        score: input.result.score,
        won: input.result.won ? 1 : 0,
        summary: input.result.summary,
        ipHash,
      })
      .onConflictDoNothing()
      .returning({ id: leaderboardEntries.id });
    return inserted.length > 0 ? "saved" : "already-submitted";
  });
}

/** Everyone's result for one daily, best first; ties go to whoever posted first. */
export async function dailyEntries(game: LeaderboardGame, date: string, token: string | null): Promise<DailyEntry[]> {
  const tokenHash = token ? sha256(token) : null;
  const rows = await db()
    .select({
      name: leaderboardPlayers.name,
      score: leaderboardEntries.score,
      won: leaderboardEntries.won,
      summary: leaderboardEntries.summary,
      tokenHash: leaderboardPlayers.tokenHash,
    })
    .from(leaderboardEntries)
    .innerJoin(leaderboardPlayers, eq(leaderboardPlayers.id, leaderboardEntries.playerId))
    .where(and(eq(leaderboardEntries.game, game), eq(leaderboardEntries.date, date)))
    .orderBy(desc(leaderboardEntries.score), leaderboardEntries.createdAt);
  return rows.map((r) => ({
    name: r.name,
    score: r.score,
    won: r.won === 1,
    summary: r.summary,
    mine: r.tokenHash === tokenHash,
  }));
}

async function allTimeRows(game: LeaderboardGame | null): Promise<AllTimeRow[]> {
  const total = sql<number>`sum(${leaderboardEntries.score})::int`;
  const rows = await db()
    .select({
      name: leaderboardPlayers.name,
      days: sql<number>`count(*)::int`,
      wins: sql<number>`sum(${leaderboardEntries.won})::int`,
      total,
    })
    .from(leaderboardEntries)
    .innerJoin(leaderboardPlayers, eq(leaderboardPlayers.id, leaderboardEntries.playerId))
    .where(game ? eq(leaderboardEntries.game, game) : undefined)
    .groupBy(leaderboardPlayers.id, leaderboardPlayers.name)
    .orderBy(desc(total), leaderboardPlayers.name)
    .limit(ALL_TIME_ROWS);
  return rows;
}

/** Totals per name over every day: across all games, and per game. */
export async function allTimeBoards(): Promise<AllTimeBoards> {
  const [overall, ...perGame] = await Promise.all([null, ...LEADERBOARD_GAMES].map((g) => allTimeRows(g)));
  return {
    overall,
    games: Object.fromEntries(LEADERBOARD_GAMES.map((g, i) => [g, perGame[i]])) as AllTimeBoards["games"],
  };
}
