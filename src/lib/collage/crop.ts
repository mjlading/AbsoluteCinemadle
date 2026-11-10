import type { Crop } from "@/lib/tmdb/images";

/**
 * A square crop widened by `factor` around its centre, for the "Enhance"
 * lifeline. It stays square in pixels, never grows past the frame's short
 * side, and is shifted back inside the frame where it would spill over an edge.
 */
export function widenCrop(crop: Crop, frame: { width: number; height: number }, factor: number): Crop {
  const sidePx = Math.min(crop.width * frame.width * factor, frame.width, frame.height);
  const width = sidePx / frame.width;
  const height = sidePx / frame.height;
  const cx = crop.x + crop.width / 2;
  const cy = crop.y + crop.height / 2;
  const clamp = (v: number, size: number) => Math.min(Math.max(v, 0), 1 - size);
  return { x: clamp(cx - width / 2, width), y: clamp(cy - height / 2, height), width, height };
}
