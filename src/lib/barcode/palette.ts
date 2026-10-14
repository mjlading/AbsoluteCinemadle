import { seededRandom } from "@/lib/random";

/*
 * The colour maths behind barcodes: the dominant colour of an image (k-means
 * over its pixels) and a hue ordering that turns a set of colours into a
 * pleasing gradient.
 */

export type Rgb = [number, number, number];

const distance2 = (a: Rgb, b: Rgb) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * The centre of the largest k-means cluster of `pixels`, a flat RGB array.
 * Seeded, so the same image always gives the same colour.
 */
export function dominantColor(pixels: Uint8Array | number[], k = 4, iterations = 12): Rgb {
  const all: Rgb[] = [];
  for (let i = 0; i + 2 < pixels.length; i += 3) all.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  if (all.length === 0) throw new Error("No pixels to analyse.");
  // Near-black shadows and blown-out highlights say little about a frame's colour;
  // ignore them unless they are nearly the whole picture.
  const toned = all.filter((p) => Math.max(...p) > NEAR_BLACK && Math.min(...p) < NEAR_WHITE);
  const points = toned.length >= all.length * 0.15 ? toned : all;

  // k-means++ start: spread the initial centres out.
  const random = seededRandom(`palette:${points.length}`);
  const centres: Rgb[] = [points[Math.floor(random() * points.length)]];
  while (centres.length < Math.min(k, points.length)) {
    const weights = points.map((p) => Math.min(...centres.map((c) => distance2(p, c))));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total === 0) break;
    let pick = random() * total;
    const index = weights.findIndex((w) => (pick -= w) <= 0);
    centres.push(points[index === -1 ? points.length - 1 : index]);
  }

  let assignment = new Array<number>(points.length).fill(0);
  for (let round = 0; round < iterations; round++) {
    assignment = points.map((p) => {
      let best = 0;
      for (let c = 1; c < centres.length; c++) if (distance2(p, centres[c]) < distance2(p, centres[best])) best = c;
      return best;
    });
    for (let c = 0; c < centres.length; c++) {
      const members = points.filter((_, i) => assignment[i] === c);
      if (members.length === 0) continue;
      centres[c] = [0, 1, 2].map((ch) => members.reduce((sum, m) => sum + m[ch], 0) / members.length) as Rgb;
    }
  }

  // Shades of one colour can land in separate clusters; merge near neighbours
  // so a large, slightly varied area isn't outvoted by a small flat one.
  const clusters = centres
    .map((centre, c) => ({ centre, size: assignment.filter((a) => a === c).length }))
    .filter((cluster) => cluster.size > 0);
  for (let i = 0; i < clusters.length; i++) {
    for (let j = clusters.length - 1; j > i; j--) {
      if (distance2(clusters[i].centre, clusters[j].centre) > MERGE_DISTANCE ** 2) continue;
      const size = clusters[i].size + clusters[j].size;
      clusters[i].centre = [0, 1, 2].map(
        (ch) => (clusters[i].centre[ch] * clusters[i].size + clusters[j].centre[ch] * clusters[j].size) / size,
      ) as Rgb;
      clusters[i].size = size;
      clusters.splice(j, 1);
    }
  }
  const largest = clusters.reduce((best, cluster) => (cluster.size > best.size ? cluster : best));
  return largest.centre.map((v) => Math.round(v)) as Rgb;
}

/** Clusters closer than this (in RGB units) count as one colour. */
const MERGE_DISTANCE = 32;
const NEAR_BLACK = 28;
const NEAR_WHITE = 240;

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function fromHex(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Hue (0-360), saturation and lightness (0-1). */
export function toHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, lightness];
}

/** Below this chroma (max minus min channel, 0-1) a colour reads as a neutral grey, whatever its hue. */
const NEUTRAL_CHROMA = 0.1;

const HUE_SLICE_DEGREES = 30;

const chroma = (rgb: Rgb) => (Math.max(...rgb) - Math.min(...rgb)) / 255;

/**
 * Orders colours into a gradient: neutrals first, dark to light, then the
 * rest around the colour wheel. Hue is meaningless for near-greys (a very dark
 * brown has a hue but looks black), so they would otherwise scatter through the strip.
 */
export function sortByHue(colors: string[]): string[] {
  const keyed = colors.map((hex) => {
    const rgb = fromHex(hex);
    return { hex, chroma: chroma(rgb), hsl: toHsl(rgb) };
  });
  const neutrals = keyed.filter((c) => c.chroma < NEUTRAL_CHROMA).sort((a, b) => a.hsl[2] - b.hsl[2]);
  // Within a slice of the colour wheel, dark to light, so each hue reads as one smooth run.
  const slice = (hue: number) => Math.floor(hue / HUE_SLICE_DEGREES);
  const hues = keyed
    .filter((c) => c.chroma >= NEUTRAL_CHROMA)
    .sort((a, b) => slice(a.hsl[0]) - slice(b.hsl[0]) || a.hsl[2] - b.hsl[2]);
  return [...neutrals, ...hues].map((c) => c.hex);
}
