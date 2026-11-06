/*
 * The evidence board's fixed geometry. Everything is in board units: the board
 * is 100 units wide and BOARD_HEIGHT tall, and 1 unit is 1cqi of the board, so
 * the layout scales as one piece and is the same every day and on every load.
 *
 * Each slot keeps clear space around it for whatever disguise its node gets:
 * `attach` is the direction (degrees clockwise from straight up) its balloon
 * floats or its kazoo sticks out, chosen to point into empty board.
 */

export const BOARD_HEIGHT = 142;

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
}

export const SLOTS: readonly Slot[] = [
  { x: 50, y: 70, size: 32, tilt: -2, attach: 0, tape: 2 }, // center: the free node
  { x: 23, y: 29, size: 23, tilt: -5, attach: -28, tape: -3 },
  { x: 77, y: 33, size: 23, tilt: 4, attach: 28, tape: 2 },
  { x: 16, y: 89, size: 23, tilt: 3, attach: -14, tape: 3 },
  { x: 84, y: 92, size: 23, tilt: -4, attach: 14, tape: -2 },
  { x: 50, y: 123, size: 23, tilt: 2, attach: -76, tape: -1 },
];

/** Where correct actors' name tags are pinned, in the order they are found. */
export const TAG_SPOTS: readonly { x: number; y: number; tilt: number }[] = [
  { x: 50, y: 11, tilt: -3 },
  { x: 16, y: 129, tilt: 4 },
  { x: 84, y: 129, tilt: -3 },
];

/** The real clip's length fills the whole ring; shorter clips draw a matching arc. */
export const FULL_RING_SECONDS = 6;

export const boardTop = (y: number) => `${(y / BOARD_HEIGHT) * 100}%`;
