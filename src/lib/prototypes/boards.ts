import "server-only";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import type { z } from "zod";

import { SITE } from "@/config/site";
import { db } from "@/db/client";
import { prototypeBoards } from "@/db/schema";
import { isIsoDate, isPlayableDate } from "@/lib/dates";

/*
 * Storage shared by the prototype games. Each has one board per day in the
 * prototype_boards table, built from TMDB the first time anyone asks for that
 * day, so nothing is imported by hand. A game keeps its whole board, answers
 * included, as one JSON document of its own shape.
 */

export type PrototypeGame = "carbon-dating" | "how-old" | "double-feature" | "ratings-cliff" | "deep-cut";

export interface PrototypeBoard<T> {
  /** Opaque id, used in the board's API addresses. */
  id: string;
  date: string;
  data: T;
}

export interface BoardSpec<T extends z.ZodType> {
  game: PrototypeGame;
  /** Raise it when the generator or the data's shape changes: boards from an older version are built again. */
  version: number;
  /** The shape of `data`; a stored board that no longer fits is built again. */
  schema: T;
  /** Builds a day's board. Use `seed` for every random choice, so a day's board is the same however often it is built. */
  build: (seed: string, date: string) => Promise<z.infer<T>>;
}

/** TMDB data may be kept 6 months; a board older than this is built again from fresh data. */
const REBUILD_AFTER_DAYS = 150;

type Row = typeof prototypeBoards.$inferSelect;

function toBoard<T extends z.ZodType>(spec: BoardSpec<T>, row: Row | undefined): PrototypeBoard<z.infer<T>> | null {
  if (!row || row.game !== spec.game || row.version !== spec.version) return null;
  if (Date.now() - row.syncedAt.getTime() > REBUILD_AFTER_DAYS * 86_400_000) return null;
  const data = spec.schema.safeParse(row.data);
  return data.success ? { id: row.id, date: row.date, data: data.data } : null;
}

/** A board by its opaque id, or null when there is none (or it belongs to another game or an older version). */
export async function getPrototypeBoard<T extends z.ZodType>(
  spec: BoardSpec<T>,
  id: string,
): Promise<PrototypeBoard<z.infer<T>> | null> {
  const [row] = await db().select().from(prototypeBoards).where(eq(prototypeBoards.id, id));
  return toBoard(spec, row);
}

/** True for a day a prototype board may be asked for: from the prototypes' launch to the latest day anyone is in. */
export function isPrototypeDate(date: string): boolean {
  return isIsoDate(date) && date >= SITE.prototypeLaunchDate && isPlayableDate(date);
}

// Players arriving together at a day without a board share one build per server instance.
const building = new Map<string, Promise<PrototypeBoard<unknown>>>();

/**
 * The game's board for a date, built and stored first if there is none yet (or
 * the stored one is outdated). Null for a date that isn't playable.
 */
export async function getOrBuildPrototypeBoard<T extends z.ZodType>(
  spec: BoardSpec<T>,
  date: string,
): Promise<PrototypeBoard<z.infer<T>> | null> {
  if (!isPrototypeDate(date)) return null;
  const key = `${spec.game}:${date}`;
  let pending = building.get(key);
  if (!pending) {
    pending = (async () => {
      const where = and(eq(prototypeBoards.game, spec.game), eq(prototypeBoards.date, date));
      const [row] = await db().select().from(prototypeBoards).where(where);
      const existing = toBoard(spec, row);
      if (existing) return existing;
      // PROTOTYPE_SEED re-rolls boards built from now on, which are otherwise the same for a date.
      const seed = `${spec.game}:${process.env.PROTOTYPE_SEED ?? ""}${date}`;
      const data = spec.schema.parse(await spec.build(seed, date));
      const id = randomBytes(6).toString("base64url");
      await db()
        .insert(prototypeBoards)
        .values({ id, game: spec.game, date, version: spec.version, data })
        .onConflictDoUpdate({
          target: [prototypeBoards.game, prototypeBoards.date],
          set: { id, version: spec.version, data, syncedAt: new Date() },
        });
      return { id, date, data };
    })().finally(() => building.delete(key));
    building.set(key, pending);
  }
  return pending as Promise<PrototypeBoard<z.infer<T>>>;
}
