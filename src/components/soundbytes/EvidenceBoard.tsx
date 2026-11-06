import type { CSSProperties, ReactNode, Ref } from "react";

import type { BoardSurface } from "@/lib/soundbytes/types";
import { DisguiseDefs } from "./DisguiseObject";
import { HeadphonesIcon, PersonIcon } from "./icons";
import { BOARD_HEIGHT, TAG_SPOTS, boardTop } from "./layout";

/**
 * The pinned evidence board: a framed surface (cork, sand, stars or wet
 * asphalt) with the nodes on it. Decoration is texture only, so nothing on the
 * board looks tappable except the nodes. Before the game starts, a headphones
 * cover dims everything but the free node.
 */
export function EvidenceBoard({
  surface,
  tags,
  covered,
  progressRef,
  children,
}: {
  surface: BoardSurface;
  /** Correct actors, pinned as name tags in the order found. */
  tags: string[];
  covered: boolean;
  progressRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="sb-frame" data-surface={surface}>
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
