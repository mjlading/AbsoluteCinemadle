import "server-only";

import { eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";

import { db } from "@/db/client";
import { prototypeBoards } from "@/db/schema";
import { errorResponse } from "@/lib/http";
import { tmdbImageUrl } from "@/lib/tmdb/images";

/*
 * Pictures for the prototype games, served under opaque ids so the client never
 * learns a TMDB file path (which would name the film). A board lists its
 * pictures in its data as `images: { [imageId]: { path, size } }`; the image
 * ids should say nothing about the answer ("0", "1", "a" ...).
 */

/** One picture of a board: a TMDB file path ("/abc.jpg") and the TMDB size to fetch ("w780", "w342", "h632" ...). */
export const BoardImageSchema = z.object({ path: z.string().startsWith("/"), size: z.string().regex(/^[a-z0-9]+$/) });
export type BoardImage = z.infer<typeof BoardImageSchema>;

/** Include this in a board's data schema as `images: BoardImagesSchema`. */
export const BoardImagesSchema = z.record(z.string(), BoardImageSchema);

const WithImages = z.object({ images: BoardImagesSchema });

/** The address of one of a board's pictures. */
export const prototypeImageUrl = (boardId: string, imageId: string) =>
  `/api/prototypes/${encodeURIComponent(boardId)}/images/${encodeURIComponent(imageId)}`;

/** Serves a board's picture, re-encoded here so nothing of TMDB's file reaches the client. */
export async function prototypeImageResponse(boardId: string, imageId: string): Promise<Response> {
  const [row] = await db().select().from(prototypeBoards).where(eq(prototypeBoards.id, boardId));
  const parsed = WithImages.safeParse(row?.data);
  const image = parsed.success && Object.hasOwn(parsed.data.images, imageId) ? parsed.data.images[imageId] : null;
  if (!image) return errorResponse(404, "There is no such picture.");
  try {
    const url = tmdbImageUrl(image.path, image.size);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB image ${url} answered ${response.status}`);
    const body = await sharp(Buffer.from(await response.arrayBuffer()))
      .webp({ quality: 82 })
      .toBuffer();
    // A board's id changes whenever it is built again, so its pictures can be cached for a day.
    return new Response(new Uint8Array(body) as BodyInit, {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error(`Could not render prototype image ${boardId}/${imageId}`, error);
    return errorResponse(502, "This picture could not be loaded.");
  }
}
