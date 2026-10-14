import type { Crop } from "@/lib/puzzle/types";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(path: string, size: string): string {
  return `${IMAGE_BASE}/${size}${path}`;
}

export function posterUrl(posterPath: string | null): string | null {
  return posterPath ? tmdbImageUrl(posterPath, "w185") : null;
}

/** TMDB's fixed sizes, as [size name, pixel width]. Profiles are portrait, so h632 is about 421 wide. */
const SIZES: Record<"profile" | "backdrop", [string, number][]> = {
  profile: [
    ["w185", 185],
    ["h632", 421],
  ],
  backdrop: [
    ["w780", 780],
    ["w1280", 1280],
  ],
};

/**
 * The smallest TMDB size whose crop still yields `outputPx` pixels across,
 * falling back to the original for tight crops.
 */
export function sourceSizeFor(source: "profile" | "backdrop", crop: Crop, outputPx: number): string {
  const neededWidth = outputPx / crop.width;
  return SIZES[source].find(([, width]) => width >= neededWidth)?.[0] ?? "original";
}

/** A crop in whole pixels, clamped to the image. */
export function cropToPixels(crop: Crop, imageWidth: number, imageHeight: number) {
  const left = Math.min(Math.max(Math.round(crop.x * imageWidth), 0), imageWidth - 1);
  const top = Math.min(Math.max(Math.round(crop.y * imageHeight), 0), imageHeight - 1);
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(crop.width * imageWidth), imageWidth - left)),
    height: Math.max(1, Math.min(Math.round(crop.height * imageHeight), imageHeight - top)),
  };
}

/** The square crop a new tile starts with: centered for backdrops, from the top for portraits (where the face is). */
export function defaultSquareCrop(imageWidth: number, imageHeight: number, source: "profile" | "backdrop"): Crop {
  if (imageWidth >= imageHeight) {
    const width = imageHeight / imageWidth;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = imageWidth / imageHeight;
  return { x: 0, y: source === "profile" ? 0 : (1 - height) / 2, width: 1, height };
}
