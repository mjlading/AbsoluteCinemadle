import "server-only";

import sharp from "sharp";

import { RULES } from "@/config/rules";
import { renderTileImage } from "./tile-image";
import { placeholderSvg } from "./placeholder-image";
import { tmdbImageUrl } from "@/lib/tmdb/images";
import { widenCrop } from "./crop";
import type { CollageTile } from "./types";

export const COLLAGE_VIEWS = ["crop", "enhanced", "frame"] as const;
export type CollageView = (typeof COLLAGE_VIEWS)[number];

export function parseCollageView(value: string | null): CollageView {
  return COLLAGE_VIEWS.find((v) => v === value) ?? "crop";
}

const FRAME_WIDTH = 1280;

/**
 * A collage tile's picture, always made on the server: its square crop, the crop
 * widened for "Enhance", or (once the game is over) the whole frame for the zoom-out.
 */
export async function renderCollageImage(
  tile: CollageTile,
  view: CollageView,
): Promise<{ body: Uint8Array; contentType: string }> {
  const { image } = tile;
  if (view === "frame") {
    if (image.kind === "placeholder") {
      return {
        body: new TextEncoder().encode(placeholderSvg(image.glyph, image.hue)),
        contentType: "image/svg+xml; charset=utf-8",
      };
    }
    const url = tmdbImageUrl(image.path, `w${FRAME_WIDTH}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB image ${url} answered ${response.status}`);
    const body = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: FRAME_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { body: new Uint8Array(body), contentType: "image/webp" };
  }
  if (view === "enhanced" && image.kind === "tmdb") {
    const crop = widenCrop(image.crop, tile.frame, RULES.closeUps.enhanceFactor);
    return renderTileImage({ ...image, crop }, "large");
  }
  return renderTileImage(image.kind === "tmdb" ? { ...image, source: "backdrop" } : image, "large");
}
