import type { CSSProperties, ReactNode, Ref } from "react";

import { DisguiseDefs } from "./DisguiseObject";
import { HeadphonesIcon, PersonIcon } from "./icons";
import { BOARD_HEIGHT, TAG_SPOTS, boardTop } from "./layout";

/**
 * The evidence board: the woven cloth of a vintage hi-fi speaker in a walnut
 * frame, the same for every film, with the nodes pinned to it. Decoration is
 * texture only, so nothing on the board looks tappable except the nodes. Before the game starts, a headphones
 * cover dims everything but the free node.
 */
export function EvidenceBoard({
  tags,
  covered,
  progressRef,
  children,
}: {
  /** Correct actors, pinned as name tags in the order found. */
  tags: string[];
  covered: boolean;
  progressRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="sb-frame">
      <div
        ref={progressRef}
        className="sb-board"
        style={{ aspectRatio: `100 / ${BOARD_HEIGHT}` } as CSSProperties}
        onContextMenu={(event) => event.preventDefault()}
      >
        <DisguiseDefs />
        {tags.slice(0, TAG_SPOTS.length).map((name, i) => {
          const spot = TAG_SPOTS[i];
          return (
            <span
              key={name}
              className="sb-tag"
              style={{ left: `${spot.x}%`, top: boardTop(spot.y), "--tilt": `${spot.tilt}deg` } as CSSProperties}
            >
              <span className="sb-pin" aria-hidden="true" />
              <PersonIcon className="sb-tag-icon" />
              <span className="sr-only">Actor found: </span>
              {name}
            </span>
          );
        })}
        {covered && (
          <div className="sb-cover" aria-hidden="true">
            <HeadphonesIcon className="sb-cover-icon" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
