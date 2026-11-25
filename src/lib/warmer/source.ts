import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { warmerPool } from "@/db/schema";
import { isPlayableDate } from "@/lib/dates";
import { normalizeTitle } from "@/lib/game/match";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb/images";
import { dailyTarget, hintRank } from "./game";
import { ranking, type Pool } from "./pool";
import type { RankedFilm, WarmerClue, WarmerDay, WarmerFilm } from "./types";

/*
 * The pool lives in the warmer_pool table (`npm run db:import-warmer`), with the secret that
 * seeds each day's hidden film. The hidden film never leaves the server until it is guessed
 * or the player gives up.
 */

const noStore = { "Cache-Control": "no-store" };

/** The pool is reloaded after this long, so a new import reaches running servers. */
const RELOAD_MS = 60 * 60 * 1000;
let cache: { pool: Pool; secret: string; at: number } | null = null;

/** Loads the pool if it isn't loaded or is old; every response awaits this first. */
async function ensurePool(): Promise<boolean> {
  if (cache && Date.now() - cache.at < RELOAD_MS) return true;
  const [row] = await db().select().from(warmerPool).where(eq(warmerPool.id, "current"));
  if (!row) return false;
  cache = { pool: { films: row.films, vectors: row.vectors }, secret: row.secret, at: Date.now() };
  days.clear();
  return true;
}
const loadPool = (): Pool => cache!.pool;
const noPool = () => errorResponse(503, "Warmer isn't set up yet.");

/** Each day's ranking (answer first) and every film's rank in it. */
const days = new Map<string, { order: number[]; rankOf: Map<number, number> }>();
function day(date: string) {
  if (!days.has(date)) {
    const order = ranking(loadPool(), dailyTarget(loadPool(), date, `warmer:${cache!.secret}`));
    days.set(date, { order, rankOf: new Map(order.map((i, r) => [loadPool().films[i].id, r + 1])) });
  }
  return days.get(date)!;
}

const film = (i: number): WarmerFilm => {
  const f = loadPool().films[i];
  return { id: f.id, title: f.title, year: f.year, posterUrl: posterUrl(f.posterPath), overview: f.overview };
};

export async function dayResponse(date: string): Promise<Response> {
  if (!isPlayableDate(date)) return errorResponse(404, "There is no Warmer for that day.");
  if (!(await ensurePool())) return noPool();
  const body: WarmerDay = { date, total: loadPool().films.length };
  return Response.json(body, { headers: noStore });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("guess"), id: z.number().int().positive() }),
  z.object({ action: z.literal("hint"), guessed: z.array(z.number().int().positive()).max(1000) }),
  z.object({ action: z.literal("reveal") }),
  z.object({ action: z.literal("clue"), kind: z.enum(["decade", "genres"]) }),
]);

export async function actionResponse(date: string, request: Request): Promise<Response> {
  if (!isPlayableDate(date)) return errorResponse(404, "There is no Warmer for that day.");
  const body = await parseJsonBody(request, Body);
  if (body instanceof Response) return body;
  if (!(await ensurePool())) return noPool();
  const { order, rankOf } = day(date);
  if (body.action === "clue") {
    // Unlocked by guess count on the client; asking early only spoils the asker's own game.
    const target = loadPool().films[order[0]];
    const clue: WarmerClue =
      body.kind === "decade"
        ? { kind: "decade", value: target.year ? `${Math.floor(target.year / 10) * 10}s` : "unknown" }
        : { kind: "genres", value: target.genres.join(", ") || "unknown" };
    return Response.json({ clue }, { headers: noStore });
  }
  const byId = (id: number) => order[rankOf.get(id)! - 1];
  let result: RankedFilm | null;
  switch (body.action) {
    case "guess": {
      const rank = rankOf.get(body.id);
      if (!rank) return errorResponse(404, "That film isn't in the game's list.");
      result = { film: film(byId(body.id)), rank };
      break;
    }
    case "hint": {
      const guessed = new Set(body.guessed.filter((id) => rankOf.has(id)).map(byId));
      const best = body.guessed.reduce<number | null>((b, id) => {
        const r = rankOf.get(id);
        return r && (b === null || r < b) ? r : b;
      }, null);
      const rank = hintRank(order, guessed, best);
      result = rank === null ? null : { film: film(order[rank - 1]), rank, hint: true };
      break;
    }
    default:
      result = { film: film(order[0]), rank: 1 };
  }
  return Response.json({ result }, { headers: noStore });
}

/** Up to 8 pool films whose title starts with, or has a word starting with, what was typed; best-known first. */
export async function searchResponse(query: string): Promise<Response> {
  const q = normalizeTitle(query);
  if (q.length < 2) return Response.json({ results: [] }, { headers: noStore });
  if (!(await ensurePool())) return noPool();
  const films = loadPool().films;
  const hits = films
    .map((f, i) => ({ i, t: normalizeTitle(f.title), votes: f.votes }))
    .filter(({ t }) => t.startsWith(q) || t.includes(` ${q}`))
    .sort((a, b) => Number(b.t.startsWith(q)) - Number(a.t.startsWith(q)) || b.votes - a.votes)
    .slice(0, 8)
    .map(({ i }) => film(i));
  return Response.json({ results: hits }, { headers: noStore });
}
