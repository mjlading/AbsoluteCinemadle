import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { getBoard as getCastingBoard } from "@/lib/casting-call/source";
import { getCollagePuzzle } from "@/lib/collage/source";
import { isIsoDate, isPlayableDate } from "@/lib/dates";
import { titleMatches } from "@/lib/game/match";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { getBoard as getRatingsBoard } from "@/lib/ratings-cliff/source";
import { getMovieWithCast } from "@/lib/tmdb/cached";
import { nameKey, NAME_MAX, tidyName } from "./names";
import { replayCastingCall, replayCloseUps, replayRatingsCliff } from "./replay";
import { allTimeBoards, clientIp, dailyEntries, submitEntry } from "./store";
import { LEADERBOARD_GAMES, type LeaderboardGame, type LeaderboardResult } from "./types";

const noStore = { "Cache-Control": "no-store" };

/** A browser's leaderboard token: random, made by the client, long enough not to guess. */
export const Token = z.string().regex(/^[A-Za-z0-9_-]{22,64}$/, "Bad token.");

const Moves = z.discriminatedUnion("game", [
  z.object({
    game: z.literal("close-ups"),
    guesses: z
      .array(z.object({ text: z.string().max(200), tmdbId: z.number().int().positive().optional() }).nullable())
      .max(RULES.closeUps.maxGuesses),
  }),
  z.object({
    game: z.literal("casting-call"),
    films: z.array(z.number().int().positive()).max(RULES.castingCall.maxGuesses),
    timedOut: z.boolean(),
  }),
  z.object({
    game: z.literal("ratings-cliff"),
    picks: z.array(z.string().min(1).max(32)).max(RULES.ratingsCliff.rounds),
  }),
]);

const SubmitBody = z.object({
  boardId: z.string().min(1).max(64),
  name: z.string().max(NAME_MAX * 2),
  token: Token,
  moves: Moves,
});

type Replayed = { date: string; result: LeaderboardResult | null } | null;

/** The board the moves were played on, and the result they make there; null when there is no such board. */
async function replay(boardId: string, moves: z.infer<typeof Moves>): Promise<Replayed> {
  switch (moves.game) {
    case "close-ups": {
      const puzzle = await getCollagePuzzle(boardId);
      if (!puzzle?.date) return null;
      const { answer } = puzzle;
      const isRight = (text: string, tmdbId?: number) =>
        tmdbId === answer.tmdbId || titleMatches(text, [answer.title, answer.originalTitle]);
      return { date: puzzle.date, result: replayCloseUps(moves.guesses, isRight) };
    }
    case "casting-call": {
      const board = await getCastingBoard(boardId);
      if (!board) return null;
      if (new Set(moves.films).size !== moves.films.length) return { date: board.date, result: null };
      const films = await Promise.all(moves.films.map((id) => getMovieWithCast(id)));
      const faces = films.map((film) => {
        const cast = new Set(film.cast.map((c) => c.personId));
        return board.personIds.flatMap((personId, i) => (cast.has(personId) ? [String(i)] : []));
      });
      return { date: board.date, result: replayCastingCall(faces, moves.timedOut, board.personIds.length) };
    }
    case "ratings-cliff": {
      const board = await getRatingsBoard(boardId);
      if (!board) return null;
      return {
        date: board.date,
        result: replayRatingsCliff(
          moves.picks,
          board.rounds.map((r) => r.answer),
        ),
      };
    }
  }
}

const MESSAGES = {
  "name-taken": [409, "That name is already taken. If it's yours, use your code from the other device."],
  "already-submitted": [409, "This browser already posted a result for this day."],
  "rate-limited": [429, "Too many results from this network. Try again in an hour."],
} as const;

/** Replays a finished game on the server and records it under the player's name. */
export async function submitResponse(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, SubmitBody);
  if (body instanceof Response) return body;
  const name = tidyName(body.name);
  if (!name || !nameKey(name)) {
    return errorResponse(400, `Names are 1 to ${NAME_MAX} letters, digits, spaces and . ' _ -`);
  }
  let replayed: Replayed;
  try {
    replayed = await replay(body.boardId, body.moves);
  } catch (error) {
    console.error("Leaderboard replay failed", error);
    return errorResponse(502, "That result couldn't be checked right now.");
  }
  if (!replayed || !isPlayableDate(replayed.date)) return errorResponse(404, "There is no such board.");
  if (!replayed.result) return errorResponse(400, "That game isn't finished.");
  const outcome = await submitEntry({
    game: body.moves.game,
    date: replayed.date,
    name,
    nameKey: nameKey(name),
    token: body.token,
    ip: clientIp(request),
    result: replayed.result,
  });
  if (outcome !== "saved") {
    const [status, message] = MESSAGES[outcome];
    return errorResponse(status, message);
  }
  return Response.json({ name, ...replayed.result }, { headers: noStore });
}

export const isLeaderboardGame = (game: string): game is LeaderboardGame =>
  (LEADERBOARD_GAMES as readonly string[]).includes(game);

/** One daily's list; `token` (optional, from the query) marks the asker's own row. */
export async function dailyResponse(game: string, date: string, request: Request): Promise<Response> {
  if (!isLeaderboardGame(game) || !isIsoDate(date)) return errorResponse(404, "There is no such leaderboard.");
  const token = Token.safeParse(request.headers.get("x-leaderboard-token")).data ?? null;
  return Response.json({ entries: await dailyEntries(game, date, token) }, { headers: noStore });
}

export async function allTimeResponse(): Promise<Response> {
  return Response.json(await allTimeBoards(), { headers: noStore });
}
