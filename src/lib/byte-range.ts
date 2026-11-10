/**
 * Reads a `Range: bytes=...` header for a body of `size` bytes, as media players send it
 * (Safari probes audio with `bytes=0-1` before playing, and won't play without a 206).
 * Returns the inclusive byte span asked for, null to send the whole body (no header,
 * another unit or several ranges), or "unsatisfiable" for a range past the end.
 */
export function parseByteRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null | "unsatisfiable" {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) return null;
  const [, from, to] = match;
  if (from === "") {
    // A suffix: the last N bytes.
    const length = Number(to);
    if (length === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(from);
  const end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  if (start >= size || end < start) return "unsatisfiable";
  return { start, end };
}
