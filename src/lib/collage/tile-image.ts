import "server-only";

import sharp from "sharp";

import { cropToPixels, sourceSizeFor, tmdbImageUrl } from "@/lib/tmdb/images";
import { placeholderSvg } from "./placeholder-image";
import type { TileImage } from "./types";

export const TILE_IMAGE_SIZES = { small: 320, large: 800 } as const;
export type TileImageSize = keyof typeof TILE_IMAGE_SIZES;

/**
 * Renders a tile's square picture. TMDB images are cropped here, on the server,
 * so the client never receives the full frame (which could give a prop tile away).
 */
export async function renderTileImage(
  image: TileImage,
  size: TileImageSize,
): Promise<{ body: Uint8Array; contentType: string }> {
  if (image.kind === "placeholder") {
    return {
      body: new TextEncoder().encode(placeholderSvg(image.glyph, image.hue)),
      contentType: "image/svg+xml; charset=utf-8",
    };
  }

  const outputPx = TILE_IMAGE_SIZES[size];
  const url = tmdbImageUrl(image.path, sourceSizeFor(image.source, image.crop, outputPx));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TMDB image ${url} answered ${response.status}`);

  const source = sharp(Buffer.from(await response.arrayBuffer()));
  const { width, height } = await source.metadata();
  if (!width || !height) throw new Error(`TMDB image ${url} has no dimensions`);

  const body = await source
    .extract(cropToPixels(image.crop, width, height))
    .resize(outputPx, outputPx, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
  return { body: new Uint8Array(body), contentType: "image/webp" };
}
