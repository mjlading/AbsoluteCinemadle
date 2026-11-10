import { z } from "zod";

import { RULES } from "@/config/rules";
import { isIsoDate } from "@/lib/dates";
import { SOUND_CATEGORIES } from "./types";

/*
 * The shape of a Soundbytes board, checked when the soundbytes lab's export is
 * imported (scripts/import-soundbytes.mts) and again when the server reads it
 * back, so a bad row can never reach a player.
 */

const Id = z.string().regex(/^[A-Za-z0-9-]{4,64}$/);
const Seconds = z.number().positive().max(30);

/** A clip we host: a file in the database, served from our own route under its opaque id. */
export const HostedClipSchema = z.object({
  id: Id,
  contentType: z.enum(["audio/mpeg", "audio/wav"]),
  seconds: Seconds,
  mouth: z
    .string()
    .regex(/^[0-9]{1,1000}$/)
    .optional(),
});

/** Where iTunes Search API previews live; a theme clue plays from nowhere else. */
export const APPLE_PREVIEW_HOST = "https://audio-ssl.itunes.apple.com/";

/** The film's theme: a window of an iTunes preview, played unaltered from Apple's servers and never copied. */
export const AppleClipSchema = z.object({
  url: z.string().startsWith(APPLE_PREVIEW_HOST),
  /** Where the window starts in the 30-second preview. */
  start: z.number().min(0).max(30),
  seconds: Seconds,
});

export const StoredClipSchema = z.union([HostedClipSchema, AppleClipSchema]);

export const SoundbytesNodesSchema = z
  .array(
    z.object({
      id: Id,
      slot: z
        .number()
        .int()
        .min(0)
        .max(RULES.soundbytes.lines - 1),
      label: z.string().min(1).max(30),
      category: z.enum(SOUND_CATEGORIES),
      art: z.string().nullable(),
      clip: StoredClipSchema,
      source: z.object({
        kind: z.enum(["youtube", "itunes", "generated"]),
        id: z.string().min(1),
        at: z.number().min(0),
      }),
    }),
  )
  .length(RULES.soundbytes.lines)
  .refine((nodes) => new Set(nodes.map((n) => n.slot)).size === nodes.length, "Every line needs its own slot.");

export const SoundbytesAnswerSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
  year: z.number().int().nullable(),
  posterPath: z.string().nullable(),
  cast: z.array(z.object({ tmdbId: z.number().int().positive(), name: z.string().min(1) })),
  /** The theme's Apple Music page, linked once the game is over; null for a board without a theme. */
  themeUrl: z.string().startsWith("https://music.apple.com/").nullable().default(null),
});

export const SoundbytesBoardSchema = z.object({
  id: Id,
  name: z.string().min(1).max(60),
  /** The day it is the daily board; absent or null for an undated board, which players never see. */
  date: z.string().refine(isIsoDate, "Dates are YYYY-MM-DD.").nullable().default(null),
  answer: SoundbytesAnswerSchema,
  nodes: SoundbytesNodesSchema,
});

/** The file the soundbytes lab exports (tools/soundbytes-lab/export.py); clip files sit in `clips/` beside it. */
export const SoundbytesExportSchema = z.object({ boards: z.array(SoundbytesBoardSchema) });
