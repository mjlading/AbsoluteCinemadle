"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type ReactNode } from "react";

import { RULES } from "@/config/rules";
import { fetchSolution, revealLabel, submitGuess } from "@/lib/game/api";
import {
  canSubmit,
  hintsLeft,
  isRepeatGuess,
  mistakesLeft,
  solvedFilmIds,
  type GridAction,
  type GridState,
} from "@/lib/game/grid-state";
import type { HintKind, PublicPuzzle } from "@/lib/puzzle/types";
import { HintDialog } from "@/components/hints/HintDialog";
import { POINTS } from "@/config/scoring";
import { Board } from "./Board";
import { GroupBanner } from "./GroupBanner";
import { InspectDialog } from "./InspectDialog";
import { MistakeMeter } from "./MistakeMeter";
import { RoundSummary } from "./RoundSummary";
import { Tile, type TileEffect } from "./Tile";

const COLUMNS = 4;
const TOAST_MS = 1800;
const SETTLE_MS = 420;
const SHAKE_MS = 400;
const REVEAL_STEP_MS = 550;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

type Message = { id: number; text: string };

/** `apiBase` is where guesses go: the day's puzzle for players, a draft for the admin preview. */
export function GridRound({
  puzzle,
  apiBase,
  state,
  dispatch,
  onContinue,
}: {
  puzzle: PublicPuzzle;
  apiBase: string;
  state: GridState;
  dispatch: Dispatch<GridAction>;
  /** Leads on to the next round once this one is over. */
  onContinue?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [effect, setEffect] = useState<(TileEffect & { ids: string[] }) | null>(null);
  const [toast, setToast] = useState<Message | null>(null);
  const [announcement, setAnnouncement] = useState<Message | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [hintKind, setHintKind] = useState<HintKind | null>(null);
  const [inspectOrigin, setInspectOrigin] = useState<DOMRect | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [solutionFailed, setSolutionFailed] = useState(false);
  const [solutionAttempt, setSolutionAttempt] = useState(0);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const messageSeq = useRef(0);

  const { groupCount, groupSize } = RULES.grid;
  const { status, solved } = state;
  const playing = status === "playing";
  const tilesById = useMemo(() => new Map(puzzle.tiles.map((t) => [t.id, t])), [puzzle.tiles]);
  const activeId = focusId && state.order.includes(focusId) ? focusId : (state.order[0] ?? null);

  const showToast = (text: string) => setToast({ id: ++messageSeq.current, text });
  const announce = (text: string) => setAnnouncement({ id: ++messageSeq.current, text });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Out of mistakes: lay the missing groups down one by one.
  useEffect(() => {
    if (status !== "lost") return;
    let cancelled = false;
    const timers: number[] = [];
    fetchSolution(apiBase).then(
      ({ groups }) => {
        if (cancelled) return;
        const found = new Set(solved.map((g) => g.filmId));
        const step = prefersReducedMotion() ? 0 : REVEAL_STEP_MS;
        groups
          .filter((g) => !found.has(g.filmId))
          .forEach((group, i) => {
            timers.push(window.setTimeout(() => dispatch({ type: "group_revealed", group }), step * (i + 1)));
          });
      },
      () => {
        if (!cancelled) setSolutionFailed(true);
      },
    );
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [status, apiBase, solved, solutionAttempt, dispatch]);

  // The action bar disappears when the round ends, so move focus to the summary.
  useEffect(() => {
    if (status !== "playing") summaryRef.current?.focus();
  }, [status]);

  function toggle(tileId: string) {
    if (pending || !playing) return;
    setFocusId(tileId);
    dispatch({ type: "toggle", tileId });
  }

  function inspect(tileId: string) {
    setRevealError(null);
    setInspectOrigin(tileRefs.current.get(tileId)?.getBoundingClientRect() ?? null);
    setInspectId(tileId);
  }

  async function submit() {
    if (!canSubmit(state) || pending) return;
    const tileIds = state.selected;
    if (isRepeatGuess(state, tileIds)) {
      showToast("Already guessed");
      announce("You already tried those four.");
      return;
    }

    setPending(true);
    try {
      const result = await submitGuess(apiBase, tileIds);
      if (result.kind === "correct") {
        setEffect({ kind: "settle", ids: tileIds, color: `var(--tier-${result.group.tier})` });
        await wait(prefersReducedMotion() ? 0 : SETTLE_MS);
        setEffect(null);
        dispatch({ type: "guess_resolved", tileIds, result });
        const { title, year } = result.group;
        const done = solved.length + 1 === groupCount;
        announce(`Correct: ${title}, ${year}.${done ? ` You found all ${groupCount} films.` : ""}`);
      } else {
        dispatch({ type: "guess_resolved", tileIds, result });
        setEffect({ kind: "shake", ids: tileIds });
        window.setTimeout(() => setEffect(null), SHAKE_MS);
        const left = mistakesLeft(state) - 1;
        const verdict = result.kind === "one_away" ? "One away" : "Not a group";
        if (result.kind === "one_away") showToast("One away");
        announce(`${verdict}. ${left === 0 ? "No mistakes left." : `${plural(left, "mistake")} left.`}`);
      }
    } catch {
      showToast("Couldn't check that guess. Try again.");
      announce("Couldn't check that guess. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function reveal(tileId: string) {
    if (state.labels[tileId] || revealingId) return;
    setRevealingId(tileId);
    setRevealError(null);
    try {
      const { label } = await revealLabel(apiBase, tileId);
      dispatch({ type: "label_revealed", tileId, label });
      announce(`Label revealed: ${label}.`);
    } catch {
      setRevealError("Couldn't reveal the label. Try again.");
    } finally {
      setRevealingId(null);
    }
  }

  function onTileKeyDown(event: KeyboardEvent<HTMLButtonElement>, tileId: string) {
    const index = state.order.indexOf(tileId);
    const last = state.order.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = Math.min(index + 1, last);
        break;
      case "ArrowLeft":
        next = Math.max(index - 1, 0);
        break;
      case "ArrowDown":
        next = index + COLUMNS <= last ? index + COLUMNS : index;
        break;
      case "ArrowUp":
        next = index - COLUMNS >= 0 ? index - COLUMNS : index;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      case "i":
      case "I":
        event.preventDefault();
        inspect(tileId);
        return;
      default:
        return;
    }
    event.preventDefault();
    const nextId = state.order[next];
    setFocusId(nextId);
    tileRefs.current.get(nextId)?.focus();
  }

  const banners = [
    ...state.solved.map((group) => ({ group, revealed: false })),
    ...state.revealed.map((group) => ({ group, revealed: true })),
  ];
  const inspected = inspectId && state.order.includes(inspectId) ? tilesById.get(inspectId) : undefined;
  const flips = Object.keys(state.labels).length;
  const allRevealed = state.solved.length + state.revealed.length === groupCount;

  return (
    <section aria-labelledby="grid-heading" className="mt-6">
      <h2 id="grid-heading" className="sr-only">
        Main round
      </h2>
      <p className="mb-3">
        Sort these {groupCount * groupSize} frames into {groupCount} films.
      </p>

      <Board
        busy={pending}
        overlay={
          toast && (
            <div
              key={toast.id}
              aria-hidden="true"
              className="toast pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-4 py-2 font-semibold text-ink shadow-lg"
            >
              {toast.text}
            </div>
          )
        }
      >
        {banners.length > 0 && (
          <ol aria-label="Films" className="flex flex-col gap-(--gap)">
            {banners.map(({ group, revealed }) => (
              <GroupBanner key={group.filmId} group={group} tilesById={tilesById} revealed={revealed} />
            ))}
          </ol>
        )}
        {state.order.length > 0 && (
          <ul aria-label="Tiles" className="grid grid-cols-4 gap-(--gap)">
            {state.order.map((id) => {
              const tile = tilesById.get(id)!;
              return (
                <Tile
                  key={id}
                  tile={tile}
                  label={state.labels[id]}
                  selected={state.selected.includes(id)}
                  effect={effect?.ids.includes(id) ? effect : undefined}
                  focusable={id === activeId}
                  buttonRef={(element) => {
                    if (element) tileRefs.current.set(id, element);
                    else tileRefs.current.delete(id);
                  }}
                  onToggle={() => toggle(id)}
                  onInspect={() => inspect(id)}
                  onKeyDown={(event) => onTileKeyDown(event, id)}
                  onFocus={() => setFocusId(id)}
                />
              );
            })}
          </ul>
        )}
      </Board>

      {playing ? (
        <div className="mt-4 flex flex-col items-center gap-4">
          <MistakeMeter mistakes={state.mistakes} />
          <div className="flex w-full justify-center gap-2">
            <ActionButton
              onClick={() => {
                dispatch({ type: "shuffle", seed: String(Math.random()) });
                announce("Tiles shuffled.");
              }}
              disabled={pending}
            >
              Shuffle
            </ActionButton>
            <ActionButton
              onClick={() => dispatch({ type: "deselect_all" })}
              disabled={pending || state.selected.length === 0}
            >
              Deselect all
            </ActionButton>
            <ActionButton primary onClick={submit} disabled={pending || !canSubmit(state)}>
              Submit
            </ActionButton>
          </div>
          {(puzzle.hints.sound > 0 || puzzle.hints.review > 0) && (
            <div className="flex w-full justify-center gap-2">
              {puzzle.hints.sound > 0 && (
                <HintButton
                  label="Sound hint"
                  cost={POINTS.grid.perSoundHint}
                  left={hintsLeft(state, "sound", puzzle.hints.sound)}
                  onClick={() => setHintKind("sound")}
                />
              )}
              {puzzle.hints.review > 0 && (
                <HintButton
                  label="Review hint"
                  cost={POINTS.grid.perReviewHint}
                  left={hintsLeft(state, "review", puzzle.hints.review)}
                  onClick={() => setHintKind("review")}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <RoundSummary won={status === "won"} mistakes={state.mistakes} flips={flips} headingRef={summaryRef} />
          {solutionFailed && (
            <p className="mt-3 text-center">
              Couldn&apos;t load the answers.{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => {
                  setSolutionFailed(false);
                  setSolutionAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
            </p>
          )}
          {onContinue && (status === "won" || allRevealed) && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onContinue}
                className="min-h-12 rounded-full bg-ink px-7 text-lg font-semibold text-table hover:bg-ink/85"
              >
                On to the bonus
              </button>
            </div>
          )}
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement && <span key={announcement.id}>{announcement.text}</span>}
      </p>

      <HintDialog
        kind={hintKind}
        apiBase={apiBase}
        solved={solvedFilmIds(state)}
        soundHints={state.soundHints}
        reviewHints={state.reviewHints}
        left={hintKind ? hintsLeft(state, hintKind, puzzle.hints[hintKind]) : 0}
        onIssued={(issued) => {
          dispatch({ type: "hint_used", ...issued });
          announce(`${issued.kind === "sound" ? "Sound" : "Review"} hint used.`);
        }}
        onClose={() => setHintKind(null)}
      />

      <InspectDialog
        tile={inspected ?? null}
        originRect={inspectOrigin}
        label={inspected ? state.labels[inspected.id] : undefined}
        selected={!!inspected && state.selected.includes(inspected.id)}
        canSelect={playing && state.selected.length < groupSize}
        revealing={!!inspected && revealingId === inspected.id}
        error={revealError}
        onToggle={() => inspected && toggle(inspected.id)}
        onReveal={() => inspected && reveal(inspected.id)}
        onClose={() => setInspectId(null)}
      />
    </section>
  );
}

function ActionButton({
  primary = false,
  onClick,
  disabled,
  children,
}: {
  primary?: boolean;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-full border-[1.5px] border-ink px-4 font-semibold transition-colors disabled:cursor-default disabled:opacity-35 ${
        primary ? "bg-ink px-6 text-table enabled:hover:bg-ink/85" : "enabled:hover:bg-ink/8"
      }`}
    >
      {children}
    </button>
  );
}

function HintButton({
  label,
  cost,
  left,
  onClick,
}: {
  label: string;
  cost: number;
  left: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 max-w-[9.75rem] min-w-0 flex-1 flex-col items-center justify-center rounded-full border-[1.5px] border-ink/40 px-3 py-1 leading-tight hover:bg-ink/5"
    >
      <span className="text-sm font-semibold">{label}</span>{" "}
      <span className="text-[0.8rem] text-ink-soft">
        −{Math.abs(cost)}
        <span className="sr-only"> points</span> · {left} left
      </span>
    </button>
  );
}
