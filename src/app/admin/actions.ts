"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/admin/action-result";
import { endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin/auth";
import * as admin from "@/lib/admin/puzzles";
import { passwordMatches } from "@/lib/admin/session-token";
import { isIsoDate } from "@/lib/dates";
import { SpendCapError } from "@/lib/llm/spend-guard";
import { suggestLiteralTranslations } from "@/lib/llm/back-translate";
import { PUZZLES_TAG } from "@/lib/puzzle/repository";
import { TILE_TYPES } from "@/lib/puzzle/types";

const PuzzleId = z.uuid();
const FilmId = z.number().int().positive();
const Tier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const Label = z.string().trim().min(1, "Give the tile a label.").max(80, "Keep labels under 80 characters.");
const Fraction = z.number().min(0).max(1);
const NewTile = z.object({
  filmId: FilmId,
  type: z.enum(TILE_TYPES),
  label: Label,
  image: z.object({
    kind: z.literal("tmdb"),
    source: z.enum(["profile", "backdrop"]),
    path: z.string().regex(/^\/[\w-]+\.(jpg|jpeg|png|webp)$/i),
    crop: z.object({ x: Fraction, y: Fraction, width: Fraction.positive(), height: Fraction.positive() }),
  }),
});
const IsoDate = z.string().refine(isIsoDate, "Pick a date.");
const LanguageCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}$/, "Use a two-letter language code, like es.");
const CountryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a two-letter country code, like MX.")
  .nullable();
const ForeignTitle = z.string().trim().min(1, "Enter the foreign title.").max(200);
const LiteralTranslation = z.string().trim().min(1, "Enter the literal translation.").max(200);
const NewWarmupEntry = z.object({
  filmId: FilmId,
  foreignTitle: ForeignTitle,
  language: LanguageCode,
  country: CountryCode,
  literalTranslation: LiteralTranslation,
});

/** Runs an admin change, turning expected problems into messages and refreshing what players and the editor see. */
async function change(work: () => Promise<void>): Promise<ActionResult> {
  await requireAdmin();
  try {
    await work();
  } catch (error) {
    if (error instanceof admin.AdminError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
    throw error;
  }
  updateTag(PUZZLES_TAG);
  refresh();
  return { ok: true };
}

export type LoginState = { error?: string };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!process.env.ADMIN_PASSWORD) {
    return { error: "Admin sign-in is not set up. Add ADMIN_PASSWORD to .env.local and restart the server." };
  }
  if (!passwordMatches(String(formData.get("password") ?? ""), process.env.ADMIN_PASSWORD)) {
    // Slows down guessing without needing shared state between server instances.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "That password is not right." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

export async function createPuzzle(): Promise<void> {
  await requireAdmin();
  const id = await admin.createDraft();
  redirect(`/admin/puzzles/${id}`);
}

export async function deletePuzzle(puzzleId: string): Promise<void> {
  await requireAdmin();
  await admin.deletePuzzle(PuzzleId.parse(puzzleId));
  updateTag(PUZZLES_TAG);
  redirect("/admin");
}

export async function addFilm(puzzleId: string, tmdbId: number, tier: number): Promise<ActionResult> {
  return change(() => admin.addFilm(PuzzleId.parse(puzzleId), FilmId.parse(tmdbId), Tier.parse(tier)));
}

export async function removeFilm(puzzleId: string, filmId: number): Promise<ActionResult> {
  return change(() => admin.removeFilm(PuzzleId.parse(puzzleId), FilmId.parse(filmId)));
}

export async function setTier(puzzleId: string, filmId: number, tier: number): Promise<ActionResult> {
  return change(() => admin.setTier(PuzzleId.parse(puzzleId), FilmId.parse(filmId), Tier.parse(tier)));
}

export async function addTile(puzzleId: string, tile: unknown): Promise<ActionResult> {
  return change(() => admin.addTile(PuzzleId.parse(puzzleId), NewTile.parse(tile)));
}

export async function updateTileLabel(puzzleId: string, tileId: string, label: string): Promise<ActionResult> {
  return change(() => admin.updateTileLabel(PuzzleId.parse(puzzleId), z.string().parse(tileId), Label.parse(label)));
}

export async function deleteTile(puzzleId: string, tileId: string): Promise<ActionResult> {
  return change(() => admin.deleteTile(PuzzleId.parse(puzzleId), z.string().parse(tileId)));
}

export async function schedulePuzzle(puzzleId: string, date: string): Promise<ActionResult> {
  return change(() => admin.schedule(PuzzleId.parse(puzzleId), IsoDate.parse(date)));
}

export async function unschedulePuzzle(puzzleId: string): Promise<ActionResult> {
  return change(() => admin.unschedule(PuzzleId.parse(puzzleId)));
}

export async function addWarmupEntry(puzzleId: string, entry: unknown): Promise<ActionResult> {
  return change(() => admin.addWarmupEntry(PuzzleId.parse(puzzleId), NewWarmupEntry.parse(entry)));
}

export async function updateWarmupTranslation(
  puzzleId: string,
  entryId: string,
  literalTranslation: string,
): Promise<ActionResult> {
  return change(() =>
    admin.updateWarmupTranslation(
      PuzzleId.parse(puzzleId),
      z.string().parse(entryId),
      LiteralTranslation.parse(literalTranslation),
    ),
  );
}

export async function removeWarmupEntry(puzzleId: string, entryId: string): Promise<ActionResult> {
  return change(() => admin.removeWarmupEntry(PuzzleId.parse(puzzleId), z.string().parse(entryId)));
}

export type SuggestionResult = { ok: true; candidates: string[] } | { ok: false; error: string };

/** Literal back-translation candidates from the LLM, inside the spend cap. */
export async function suggestBackTranslations(input: {
  foreignTitle: string;
  language: string;
  country: string | null;
}): Promise<SuggestionResult> {
  await requireAdmin();
  const parsed = z
    .object({ foreignTitle: ForeignTitle, language: LanguageCode, country: CountryCode })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const candidates = await suggestLiteralTranslations(parsed.data);
    return candidates.length > 0
      ? { ok: true, candidates }
      : { ok: false, error: "No suggestions came back. Write the translation yourself." };
  } catch (error) {
    if (error instanceof SpendCapError) return { ok: false, error: error.message };
    console.error("Back-translation failed", error);
    return { ok: false, error: "Suggestions are unavailable right now. Write the translation yourself." };
  }
}
