import "server-only";

import { z } from "zod";

import { RULES } from "@/config/rules";
import { errorResponse, parseJsonBody } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb/images";
import { titleMatches } from "@/lib/warmup/match";
import { checkGuess, solution, tileLabel, toPublicPuzzle } from "./grid";
import { parseTileImageSize, renderTileImage } from "./tile-image";
import { seededRandom, shuffled } from "@/lib/random";
import { getBarcodeUpload } from "./repository";
import type { BonusResult, Puzzle, PublicBonus, WarmupAnswer, WarmupEntry, WarmupGuessResult } from "./types";

/*
 * Request handling shared by the player routes (/api/puzzles/[date]/...) and
 * the admin preview routes (/api/admin/puzzles/[id]/...), so a preview behaves
 * exactly like the live game.
 */

const noStore = { "Cache-Control": "no-store" };

export function puzzleResponse(puzzle: Puzzle, apiBase: string, date: string): Response {
  return Response.json(toPublicPuzzle(puzzle, apiBase, date), { headers: noStore });
}

const GuessBody = z.object({
  tileIds: z.array(z.string().max(64)).length(RULES.grid.groupSize),
});

export async function guessResponse(puzzle: Puzzle, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, GuessBody);
  if (body instanceof Response) return body;
  const result = checkGuess(puzzle, body.tileIds);
  if (result.kind === "invalid") return errorResponse(400, result.reason);
  return Response.json(result, { headers: noStore });
}

const LabelBody = z.object({ tileId: z.string().max(64) });

export async function labelResponse(puzzle: Puzzle, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, LabelBody);
  if (body instanceof Response) return body;
  const label = tileLabel(puzzle, body.tileId);
  if (label === null) return errorResponse(404, "That tile is not in this puzzle.");
  return Response.json({ tileId: body.tileId, label }, { headers: noStore });
}

export function solutionResponse(puzzle: Puzzle): Response {
  return Response.json({ groups: solution(puzzle) }, { headers: noStore });
}

/**
 * Tiles never change once created (an edit makes a new tile), so their pictures
 * can be cached. TMDB allows caching its content for up to 6 months; 30 days stays well inside that.
 */
export async function tileImageResponse(
  puzzle: Puzzle,
  tileId: string,
  request: Request,
  cacheControl = "public, max-age=2592000, immutable",
): Promise<Response> {
  const tile = puzzle.tiles.find((t) => t.id === tileId);
  if (!tile) return errorResponse(404, "That tile is not in this puzzle.");
  const size = parseTileImageSize(new URL(request.url).searchParams.get("size"));
  try {
    const { body, contentType } = await renderTileImage(tile.image, size);
    return new Response(body as BodyInit, {
      headers: { "Content-Type": contentType, "Cache-Control": cacheControl },
    });
  } catch (error) {
    console.error(`Could not render tile ${tileId}`, error);
    return errorResponse(502, "The picture for this tile could not be loaded.");
  }
}

const warmupAnswer = (entry: WarmupEntry): WarmupAnswer => ({
  cardId: entry.id,
  title: entry.answer.title,
  year: entry.answer.year,
  posterUrl: posterUrl(entry.answer.posterPath),
});

const WarmupGuessBody = z.object({
  cardId: z.string().max(64),
  guess: z.string().max(200),
  /** Set when the player picked a film from the suggestions. */
  tmdbId: z.number().int().positive().optional(),
});

/** Checks a warm-up guess; the answer is only returned once it has been earned. */
export async function warmupGuessResponse(puzzle: Puzzle, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, WarmupGuessBody);
  if (body instanceof Response) return body;
  const entry = puzzle.warmup.find((e) => e.id === body.cardId);
  if (!entry) return errorResponse(404, "That card is not in this puzzle.");

  const correct =
    body.tmdbId === entry.filmId || titleMatches(body.guess, [entry.answer.title, entry.answer.originalTitle]);
  const result: WarmupGuessResult = correct ? { correct: true, answer: warmupAnswer(entry) } : { correct: false };
  return Response.json(result, { headers: noStore });
}

/** Every warm-up answer, for revealing the cards once the round is over. */
export function warmupSolutionResponse(puzzle: Puzzle): Response {
  return Response.json({ answers: puzzle.warmup.map(warmupAnswer) }, { headers: noStore });
}

/**
 * The bonus round: the day's films (easiest first) and their barcodes in a
 * shuffled order, so position gives nothing away. Barcode ids are random, so
 * the pairing cannot be worked out from them.
 */
export function bonusResponse(puzzle: Puzzle, apiBase: string): Response {
  const bonus: PublicBonus = {
    films: [...puzzle.films]
      .sort((a, b) => a.tier - b.tier)
      .map((f) => ({ filmId: f.tmdbId, title: f.title, year: f.year, posterUrl: posterUrl(f.posterPath) })),
    barcodes: shuffled(puzzle.films, seededRandom(`${puzzle.id}:barcodes`)).map((f) => ({
      id: f.barcode.id,
      colors: f.barcode.upload ? null : f.barcode.colors,
      imageUrl: f.barcode.upload ? `${apiBase}/barcodes/${f.barcode.id}/image` : null,
    })),
  };
  return Response.json(bonus, { headers: noStore });
}

const BonusCheckBody = z.object({ matches: z.record(z.string().max(64), z.number().int()) });

/** Scores the player's barcode pairings, revealing the right film for every barcode. */
export async function bonusCheckResponse(puzzle: Puzzle, request: Request): Promise<Response> {
  const body = await parseJsonBody(request, BonusCheckBody);
  if (body instanceof Response) return body;
  const results: BonusResult[] = puzzle.films.map((f) => ({
    barcodeId: f.barcode.id,
    filmId: f.tmdbId,
    correct: body.matches[f.barcode.id] === f.tmdbId,
  }));
  return Response.json({ results }, { headers: noStore });
}

export async function barcodeImageResponse(
  puzzle: Puzzle,
  barcodeId: string,
  cacheControl = "public, max-age=86400",
): Promise<Response> {
  const film = puzzle.films.find((f) => f.barcode.id === barcodeId);
  const upload = film?.barcode.upload ? await getBarcodeUpload(puzzle.id, film.tmdbId) : null;
  if (!upload) return errorResponse(404, "That barcode has no image.");
  return new Response(new Uint8Array(upload.data), {
    headers: { "Content-Type": upload.contentType, "Cache-Control": cacheControl },
  });
}
