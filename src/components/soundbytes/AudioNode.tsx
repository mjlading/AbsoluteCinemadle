"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import { RULES } from "@/config/rules";
import type { NodeStage } from "@/lib/soundbytes/state";
import type { PublicSoundNode } from "@/lib/soundbytes/types";
import { DisguiseObject, type DisguiseMode } from "./DisguiseObject";
import { CategoryIcon, HandIcon, PriceChip } from "./icons";
import { ClapperHead } from "./ClapperHead";
import { FeltPuppet } from "./FeltPuppet";
import { FULL_RING_SECONDS, boardTop, type Slot } from "./layout";
import { useHold, type HoldVerdict } from "./use-hold";

/** The ring is drawn in a 100-unit box around the record; this is its circumference. */
const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const EFFECT_MS = 650;

type Effect = "bought" | "removed" | "refused" | "nudged";

export interface AudioNodeProps {
  node: PublicSoundNode;
  slot: Slot;
  stage: NodeStage;
  /** Which clip a tap plays: the disguised one until the disguise is off, or the game is over. */
  version: "disguised" | "real";
  playing: boolean;
  /** What the next hold costs, shown as a chip; null when a hold does nothing. */
  cost: number | null;
  verdict: () => HoldVerdict;
  /** Above the headphones cover before the game starts. */
  raised: boolean;
  /** Under the headphones cover: not reachable until the game starts. */
  inactive: boolean;
  hint: "tap" | "hold" | null;
  label: string;
  onTap: () => void;
  onHold: () => void;
}

/**
 * One audio node: score is a record pinned to the board, with a ring showing
 * the clip's length and playback; dialogue is a felt puppet and sound effects
 * a clapperboard, both of which talk while their clip plays. Each has its
 * label on a strip of tape and wears its disguise. Tap plays; hold spends
 * (buys a locked node, removes a disguise).
 */
export function AudioNode({
  node,
  slot,
  stage,
  version,
  playing,
  cost,
  verdict,
  raised,
  inactive,
  hint,
  label,
  onTap,
  onHold,
}: AudioNodeProps) {
  const [effect, setEffect] = useState<{ kind: Effect; id: number } | null>(null);
  const flash = (kind: Effect) => setEffect({ kind, id: Date.now() });
  useEffect(() => {
    if (!effect) return;
    const timer = window.setTimeout(() => setEffect(null), EFFECT_MS);
    return () => window.clearTimeout(timer);
  }, [effect]);

  const hold = useHold({
    ms: RULES.soundbytes.holdMs,
    verdict,
    onTap: () => {
      if (stage === "locked" && version === "disguised") flash("nudged");
      onTap();
    },
    onComplete: () => {
      flash(stage === "locked" ? "bought" : "removed");
      onHold();
    },
    onRefuse: () => flash("refused"),
  });

  const clip = node.clips[version];
  const arc = RING_LENGTH * Math.min(1, clip.seconds / FULL_RING_SECONDS);
  const disguiseMode: DisguiseMode | null =
    stage === "disguised" ? (effect?.kind === "bought" ? "enter" : "idle") : effect?.kind === "removed" ? "exit" : null;

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
      data-stage={stage}
      data-category={node.category}
      data-holding={hold.holding || undefined}
      data-playing={playing || undefined}
      data-effect={effect?.kind}
      data-raised={raised || undefined}
      data-large={node.slot === 0 || undefined}
      data-figure={node.category === "score" ? undefined : ""}
      aria-label={label}
      tabIndex={inactive ? -1 : undefined}
      {...hold.handlers}
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
        {stage === "locked" && <circle className="sb-ring-hold" cx="50" cy="50" r={RING_RADIUS} pathLength={1} />}
      </svg>

      {node.category === "dialogue" ? (
        <FeltPuppet slot={node.slot} uid={node.id} />
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

      {disguiseMode && (
        <DisguiseObject
          key={`${disguiseMode === "exit" ? effect?.id : "on"}`}
          disguise={node.disguise}
          attach={slot.attach}
          cost={stage === "disguised" ? cost : null}
          mode={disguiseMode}
        />
      )}

      <span className="sb-pin" aria-hidden="true" />
      <span className="sb-tape" aria-hidden="true">
        {node.label}
      </span>
      {stage === "locked" && cost !== null && <PriceChip cost={cost} className="sb-node-chip" />}
      {hint && <Hint kind={hint} node={node} slot={slot} />}
    </button>
  );
}

/** The first-visit pointer: a tap on the record, then a hold on its disguise. */
function Hint({ kind, node, slot }: { kind: "tap" | "hold"; node: PublicSoundNode; slot: Slot }) {
  const onObject = kind === "hold" && node.disguise !== "muffle";
  return (
    <span
      className="sb-hint"
      data-kind={kind}
      data-on-object={onObject || undefined}
      style={{ "--attach": `${slot.attach}deg` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="sb-hint-ripple" />
      <HandIcon className="sb-hint-hand" />
    </span>
  );
}
