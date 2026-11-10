/*
 * The evidence board's fixed geometry. Everything is in board units: the board
 * is 100 units wide and BOARD_HEIGHT tall, and 1 unit is 1cqi of the board, so
 * the layout scales as one piece and is the same every day and on every load.
 *
 * Slots are in the order lines open: line 1 in the larger center slot, the
 * rest around it. `attach` is the direction (degrees clockwise from straight
 * up) of open board beside a slot. `face` turns a puppet toward the middle.
 */

export const BOARD_HEIGHT = 128;

export interface Slot {
  /** Center of the node's record, in board units. */
  x: number;
  y: number;
  /** Diameter of the record. */
  size: number;
  /** Hand-pinned tilt, in degrees. */
  tilt: number;
  attach: number;
  /** Tilt of the label tape relative to the node. */
  tape: number;
  face: "left" | "right";
}

export const SLOTS: readonly Slot[] = [
  { x: 50, y: 64, size: 32, tilt: -2, attach: 0, tape: 2, face: "right" }, // center: line 1, open from the start
  { x: 23, y: 27, size: 23, tilt: -5, attach: -28, tape: -3, face: "right" },
  { x: 77, y: 30, size: 23, tilt: 4, attach: 28, tape: 2, face: "left" },
  { x: 21, y: 99, size: 23, tilt: 3, attach: -14, tape: 3, face: "right" },
  { x: 79, y: 102, size: 23, tilt: -4, attach: 14, tape: -2, face: "left" },
];

/** Where correct actors' name tags are pinned, in the order they are found. */
export const TAG_SPOTS: readonly { x: number; y: number; tilt: number }[] = [
  { x: 50, y: 9, tilt: -3 },
  { x: 50, y: 120, tilt: 4 },
  { x: 50, y: 110, tilt: -3 },
];

/** The real clip's length fills the whole ring; shorter clips draw a matching arc. */
export const FULL_RING_SECONDS = 6;

export const boardTop = (y: number) => `${(y / BOARD_HEIGHT) * 100}%`;
