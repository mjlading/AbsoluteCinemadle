"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import type { LineMark } from "@/lib/soundbytes/state";
import type { SoundNode } from "@/lib/soundbytes/types";
import { ClapperHead } from "./ClapperHead";
import { CategoryIcon, HandIcon, LockIcon } from "./icons";
import { FeltPuppet } from "./FeltPuppet";
import { FULL_RING_SECONDS, boardTop, type Slot } from "./layout";

/** The ring is drawn in a 100-unit box around the record; this is its circumference. */
const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const EFFECT_MS = 650;

type Effect = "opened" | "refused";

export interface AudioNodeProps {
  node: SoundNode;
  slot: Slot;
  /** Not open yet: a wrong guess or a skip opens the next line. */
  locked: boolean;
  /** How this line's try went; its label tape shows it, so the board is the try counter. */
  mark: LineMark;
  playing: boolean;
  /** Above the headphones cover before the game starts. */
  raised: boolean;
  /** Under the headphones cover: not reachable until the game starts. */
  inactive: boolean;
  hint: "tap" | null;
  label: string;
  onTap: () => void;
}

/**
 * One line on the board: dialogue is a felt puppet and sound effects a
 * clapperboard, both of which talk while their clip plays; score is a record
 * with a ring showing the clip's length and playback. Each has its label on a
 * strip of tape. A locked one is grey with a padlock and pops into colour when
 * a miss opens it. Tap plays an open one and taps again to stop.
 */
export function AudioNode({ node, slot, locked, mark, playing, raised, inactive, hint, label, onTap }: AudioNodeProps) {
  const [effect, setEffect] = useState<{ kind: Effect; id: number } | null>(null);
  // Each effect gets a new id, so the same one can play twice in a row.
  const flash = (kind: Effect) => setEffect((e) => ({ kind, id: (e?.id ?? 0) + 1 }));
  useEffect(() => {
    if (!effect) return;
    const timer = window.setTimeout(() => setEffect(null), EFFECT_MS);
    return () => window.clearTimeout(timer);
  }, [effect]);

  // Opening is announced by the game; the node marks it by popping into colour.
  const [wasLocked, setWasLocked] = useState(locked);
  if (wasLocked !== locked) {
    setWasLocked(locked);
    if (!locked) setEffect({ kind: "opened", id: (effect?.id ?? 0) + 1 });
  }

  const arc = RING_LENGTH * Math.min(1, node.clip.seconds / FULL_RING_SECONDS);
  const style = {
    left: `${slot.x}%`,
    top: boardTop(slot.y),
    "--d": slot.size,
    "--tilt": `${slot.tilt}deg`,
    "--tape-tilt": `${slot.tape}deg`,
    "--arc": arc,
  } as CSSProperties;

  return (
    <button
      type="button"
      className="sb-node"
      style={style}
      data-stage={locked ? "locked" : "open"}
      data-mark={mark}
      data-category={node.category}
      data-playing={playing || undefined}
      data-effect={effect?.kind}
      data-raised={raised || undefined}
      data-large={node.slot === 0 || undefined}
      data-figure={node.category === "score" ? undefined : ""}
      data-face={slot.face}
      aria-label={label}
      tabIndex={inactive ? -1 : undefined}
      onClick={() => {
        if (locked) flash("refused");
        onTap();
      }}
    >
      <svg className="sb-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="sb-ring-track" cx="50" cy="50" r={RING_RADIUS} strokeDasharray={`${arc} ${RING_LENGTH}`} />
        <circle
          className="sb-ring-progress"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={`${arc} ${RING_LENGTH}`}
          strokeDashoffset={arc}
        />
      </svg>

      {node.category === "dialogue" ? (
        <FeltPuppet slot={node.slot} uid={node.id} face={slot.face} />
      ) : node.category === "sfx" ? (
        <ClapperHead slot={node.slot} uid={node.id} />
      ) : (
        <span className="sb-disc">
          <span className="sb-disc-label">
            {node.art ? (
              <Image src={node.art} alt="" fill unoptimized className="object-cover" draggable={false} />
            ) : (
              <CategoryIcon category={node.category} className="sb-disc-icon" />
            )}
          </span>
        </span>
      )}

      <span className="sb-pin" aria-hidden="true" />
      <span className="sb-tape" aria-hidden="true">
        {node.label}
        {mark === "spent" && (
          <svg viewBox="0 0 12 12" className="sb-tape-cross">
            <path pathLength={1} d="M2.2 2.4 C4.5 4.8 7 7.2 9.8 9.6" />
            <path pathLength={1} d="M9.8 2.2 C7.4 4.6 5 7 2.2 9.8" />
          </svg>
        )}
      </span>
      {locked && (
        <span className="sb-lock" aria-hidden="true">
          <LockIcon className="sb-lock-icon" />
        </span>
      )}
      {hint && <Hint />}
    </button>
  );
}

/** The first-visit pointer: a tap on line 1. */
function Hint() {
  return (
    <span className="sb-hint" data-kind="tap" aria-hidden="true">
      <span className="sb-hint-ripple" />
      <HandIcon className="sb-hint-hand" />
    </span>
  );
}
