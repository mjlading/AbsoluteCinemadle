const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A random, opaque tile id. It carries no information about the tile, by design. */
export function newTileId(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 62 does not divide 256 evenly; the slight bias is irrelevant for opaque ids.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
