import "server-only";

import sharp from "sharp";

import type { ImageInfo } from "@/lib/tmdb/api";
import { tmdbImageUrl } from "@/lib/tmdb/images";
import { dominantColor, sortByHue, toHex } from "./palette";

/** Bands in a generated barcode; more backdrops add little but cost time. */
const MAX_BANDS = 30;
const CONCURRENCY = 6;

/** The dominant colour of one backdrop, analysed from a small thumbnail. */
async function backdropColor(path: string): Promise<string> {
  const response = await fetch(tmdbImageUrl(path, "w300"));
  if (!response.ok) throw new Error(`TMDB image ${path} answered ${response.status}`);
  const pixels = await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(48, 27, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  return toHex(dominantColor(pixels));
}

/**
 * A "palette strip" barcode for a film: one band per backdrop in its dominant
 * colour, sorted by hue. A stand-in for a real movie barcode, which would need
 * the film itself.
 */
export async function generatePalette(backdrops: ImageInfo[]): Promise<string[]> {
  const paths = backdrops.slice(0, MAX_BANDS).map((b) => b.path);
  const colors: string[] = [];
  for (let start = 0; start < paths.length; start += CONCURRENCY) {
    const batch = await Promise.allSettled(paths.slice(start, start + CONCURRENCY).map(backdropColor));
    for (const result of batch) if (result.status === "fulfilled") colors.push(result.value);
  }
  return sortByHue(colors);
}
