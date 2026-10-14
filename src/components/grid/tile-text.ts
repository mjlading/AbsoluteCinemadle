import type { PublicTile, TileType } from "@/lib/puzzle/types";

export const TILE_TYPE_NAMES: Record<TileType, string> = {
  headshot: "headshot",
  still: "film still",
  empty_set: "empty set",
  prop: "prop close-up",
};

/** Alt text that names the tile without giving away the answer. */
export function tileAltText(tile: PublicTile): string {
  return `Tile ${tile.number}, ${TILE_TYPE_NAMES[tile.type]}`;
}
