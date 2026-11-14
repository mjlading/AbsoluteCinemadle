import "server-only";

import sharp from "sharp";
import { z } from "zod";

import { errorResponse, parseJsonBody } from "@/lib/http";
import { getMovieWithCast, getPerson } from "@/lib/tmdb/cached";
import { tmdbImageUrl } from "@/lib/tmdb/images";
import { getBoard, type CastingCallBoard } from "./source";
import type { CastingBestRoute, CastingGuessResult, FoundFace, PublicCastingBoard } from "./types";

/*
 * Request handling for /api/casting-call/... Who is on a board is the puzzle,
 * so the client only gets opaque face ids and pictures rendered here; the
 * names come from the solution route, which the game calls when Start is pressed,
 * and the best route's films from the best-route route, called once the game is over.
 */

const noStore = { "Cache-Control": "no-store" };
const FACE_PX = 320;

const faceUrl = (board: CastingCallBoard, faceId: string) =>
  `/api/casting-call/${encodeURIComponent(board.id)}/faces/${faceId}/image`;

/** A face's opaque id: its position on the board, which says nothing about who it is. */
const faceIds = (board: CastingCallBoard) => board.personIds.map((_, i) => String(i));

/** Loads the board for a route's id param, or the error response to return instead. */
export async function boardOrErrorResponse(id: string): Promise<CastingCallBoard | Response> {
  return (await getBoard(id)) ?? errorResponse(404, "There is no such board.");
}

export function boardResponse(board: CastingCallBoard): Response {
  const body: PublicCastingBoard = {
    id: board.id,
    date: board.date,
    faces: faceIds(board).map((id) => ({ id, imageUrl: faceUrl(board, id) })),
  };
  return Response.json(body, { headers: noStore });
}

const GuessBody = z.object({ tmdbId: z.number().int().positive() });

export async function guessResponse(board: CastingCallBoard, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  try {
    const film = await getMovieWithCast(body.tmdbId);
    // Any credited role counts: the player named a film the actor is in.
    const inCast = new Map(film.cast.map((c) => [c.personId, c.name]));
    const found: FoundFace[] = [];
    board.personIds.forEach((personId, i) => {
      if (inCast.has(personId)) found.push({ faceId: String(i), name: "" });
    });
    // Names come from the person record, as TMDB spells it, not the film's credit.
    const people = await Promise.all(found.map((f) => getPerson(board.personIds[Number(f.faceId)])));
    found.forEach((f, i) => (f.name = people[i].name));
    const result: CastingGuessResult = {
      film: { tmdbId: film.tmdbId, title: film.title, year: film.year },
      found,
    };
    return Response.json(result, { headers: noStore });
  } catch (error) {
    console.error("Casting call guess failed", error);
    return errorResponse(502, "That film couldn't be checked right now.");
  }
}

/** Every face's name, for when the player presses Start. Calling it early only spoils the caller's own game. */
export async function solutionResponse(board: CastingCallBoard): Promise<Response> {
  try {
    const people = await Promise.all(board.personIds.map((id) => getPerson(id)));
    const faces: FoundFace[] = people.map((p, i) => ({ faceId: String(i), name: p.name }));
    return Response.json({ faces }, { headers: noStore });
  } catch (error) {
    console.error("Casting call solution failed", error);
    return errorResponse(502, "The names couldn't be loaded right now.");
  }
}

/**
 * The board's best route: the lesser-known film each group shares. Called when
 * the game is over; calling it early only spoils the caller's own game.
 */
export async function bestRouteResponse(board: CastingCallBoard): Promise<Response> {
  try {
    const films = await Promise.all(board.groups.map((g) => getMovieWithCast(g.filmId)));
    const body: CastingBestRoute = {
      films: films.map((film, i) => ({
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        faceIds: board.groups[i].faces.map(String),
      })),
    };
    return Response.json(body, { headers: noStore });
  } catch (error) {
    console.error("Casting call best route failed", error);
    return errorResponse(502, "The best route couldn't be loaded right now.");
  }
}

const SILHOUETTE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2c3038"/><circle cx="50" cy="40" r="18" fill="#525a67"/><path d="M14 100c4-24 18-34 36-34s32 10 36 34z" fill="#525a67"/></svg>`;

/**
 * A face as a square picture made here, so the client never learns the TMDB
 * file path. Cached for a day: a board's id and faces never change, but the
 * people's photos on TMDB may.
 */
export async function faceImageResponse(board: CastingCallBoard, faceId: string): Promise<Response> {
  const personId = board.personIds[Number(faceId)];
  if (!/^\d+$/.test(faceId) || personId === undefined) return errorResponse(404, "That face is not on this board.");
  try {
    const person = await getPerson(personId);
    if (!person.profilePath) {
      return new Response(SILHOUETTE, {
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
      });
    }
    const url = tmdbImageUrl(person.profilePath, "h632");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB image ${url} answered ${response.status}`);
    const body = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(FACE_PX, FACE_PX, { fit: "cover", position: "top" })
      .webp({ quality: 82 })
      .toBuffer();
    return new Response(new Uint8Array(body) as BodyInit, {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error(`Could not render casting call face ${board.id}/${faceId}`, error);
    return errorResponse(502, "This face could not be loaded.");
  }
}
