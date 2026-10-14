"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { RULES } from "@/config/rules";
import { fetchSolution, revealLabel, submitGuess } from "@/lib/game/api";
import { canSubmit, gridReducer, initialGridState, isRepeatGuess, mistakesLeft } from "@/lib/game/grid-state";
import type { PublicPuzzle } from "@/lib/puzzle/types";
import { Board } from "./Board";
import { GroupBanner } from "./GroupBanner";
import { InspectDialog } from "./InspectDialog";
import { MistakeMeter } from "./MistakeMeter";
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

export function GridRound({ puzzle }: { puzzle: PublicPuzzle }) {
  const [state, dispatch] = useReducer(gridReducer, puzzle, initialGridState);
  const [pending, setPending] = useState(false);
  const [effect, setEffect] = useState<(TileEffect & { ids: string[] }) | null>(null);
  const [toast, setToast] = useState<Message | null>(null);
  const [announcement, setAnnouncement] = useState<Message | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [solutionFailed, setSolutionFailed] = useState(false);
  const [solutionAttempt, setSolutionAttempt] = useState(0);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const messageSeq = useRef(0);

  const { groupCount, groupSize } = RULES.grid;
  const { status, date, solved } = state;
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
    fetchSolution(date).then(
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
  }, [status, date, solved, solutionAttempt]);

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
      const result = await submitGuess(date, tileIds);
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
      const { label } = await revealLabel(date, tileId);
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
            <ActionButton onClick={() => dispatch({ type: "deselect_all" })} disabled={pending || state.selected.length === 0}>
              Deselect all
            </ActionButton>
            <ActionButton primary onClick={submit} disabled={pending || !canSubmit(state)}>
              Submit
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <h3 ref={summaryRef} tabIndex={-1} className="font-display text-[2rem] font-[850] leading-none">
            {status === "won" ? `You found all ${groupCount} films` : "Out of mistakes"}
          </h3>
          <p className="mt-2 text-ink-soft">
            {status === "won"
              ? `${plural(state.mistakes, "mistake")}, ${plural(flips, "label")} revealed.`
              : "Here are today's films."}
          </p>
          {solutionFailed && (
            <p className="mt-3">
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
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement && <span key={announcement.id}>{announcement.text}</span>}
      </p>

      <InspectDialog
        tile={inspected ?? null}
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
