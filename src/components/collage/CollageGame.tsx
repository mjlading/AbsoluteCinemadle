"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/game/Confetti";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { TitleGuess } from "./TitleGuess";
import { SITE } from "@/config/site";
import { fetchCollageDay, fetchCollageSolution, guessCollage } from "@/lib/collage/api";
import { closeUpsNumber } from "@/lib/collage/day";
import {
  alreadyGuessed,
  collageReducer,
  currentRound,
  initialCollageState,
  type CollageAction,
} from "@/lib/collage/state";
import type { CollageSolution, PublicCollagePuzzle } from "@/lib/collage/types";
import { localIsoDate } from "@/lib/dates";
import { ApiError } from "@/lib/game/api";
import { readJson, usePersistentReducer, writeJson } from "@/lib/game/storage";
import { normalizeTitle } from "@/lib/game/match";
import { CollageGrid, ENHANCE_ID, EnhanceBadge, type FrameInfo } from "./CollageTiles";
import { GuessHistory } from "./GuessHistory";
import { HelpDialog } from "./HelpDialog";
import { KeywordStrip, PANEL_ID } from "./KeywordStrip";
import { ResultPanel } from "./ResultPanel";

const HELP_SEEN_KEY = "close-ups:help-seen";
const GIVE_UP_CONFIRM_MS = 3000;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A short jolt for an element, skipped for players who asked for less motion. */
function jolt(element: Element | null | undefined, keyframes: Keyframe[], duration: number) {
  if (element && !reducedMotion()) element.animate(keyframes, { duration, easing: "ease-in-out" });
}

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(3px)" },
  { transform: "translateX(0)" },
];
const PULSE: Keyframe[] = [{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }];

/**
 * Loads one day's puzzle, then plays it; progress is kept on this device.
 * Without a date it is today's puzzle, by the player's own calendar.
 */
export function CollageGame({ date }: { date?: string }) {
  const [puzzle, setPuzzle] = useState<PublicCollagePuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    // A day still ahead of the player's own calendar stays closed, even when the server would allow it.
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchCollageDay(date ?? today)).then(
      (loaded) => !cancelled && setPuzzle(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? date
                ? "There's no Close-Up for that day."
                : "No Close-Up today. Come back tomorrow."
              : "Couldn't load the puzzle. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!puzzle) {
    return (
      <>
        <TopBar />
        <main className="flex flex-1 items-start justify-center px-4 pt-16">
          {error ? (
            <div className="text-center">
              <p>{error}</p>
              <Link
                href={SITE.games.closeUpsArchive}
                className="mt-3 inline-block font-semibold underline underline-offset-4"
              >
                Previous days
              </Link>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-ink-soft">
              <ReelSpinner className="size-5" /> Loading the puzzle&hellip;
            </p>
          )}
        </main>
      </>
    );
  }
  return <CollagePlay key={puzzle.id} puzzle={puzzle} />;
}

function CollagePlay({ puzzle }: { puzzle: PublicCollagePuzzle }) {
  const signature = useMemo(() => puzzle.keywords.flatMap((k) => k.tiles.map((t) => t.id)).join(","), [puzzle]);
  const [state, dispatch] = usePersistentReducer(
    `close-ups:${puzzle.id}`,
    signature,
    collageReducer,
    undefined,
    initialCollageState,
  );
  const round = currentRound(state);
  const playing = state.status === "playing";
  const last = puzzle.keywords.length - 1;
  const labels = puzzle.keywords.map((k) => k.label);

  // A keyword the player chose to look at again holds until the game moves on; then the view follows it.
  const [picked, setPicked] = useState<{ index: number; round: number; status: string } | null>(null);
  const view = picked && picked.round === round && picked.status === state.status ? picked.index : round;
  const [effect, setEffect] = useState<"swap" | "slip" | null>(null);
  const [picking, setPicking] = useState(false);
  const [freshEnhance, setFreshEnhance] = useState(false);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ id: number; text: string } | null>(null);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [helpOpen, setHelpOpen] = useState(() => readJson(HELP_SEEN_KEY) === null);
  const [solution, setSolution] = useState<CollageSolution | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const pending = useRef(false);
  const announcements = useRef(0);
  const preloaded = useRef(new Set<number>());
  const guessRow = useRef<HTMLDivElement>(null);
  const historyRow = useRef<HTMLDivElement>(null);

  const announce = (text: string) => setAnnouncement({ id: ++announcements.current, text });

  // Once the game is over: the answer (on a loss) and every tile's frame for the zoom-out.
  useEffect(() => {
    if (state.status === "playing") return;
    let cancelled = false;
    fetchCollageSolution(puzzle.id).then(
      (loaded) => {
        if (cancelled) return;
        setSolution(loaded);
        // A loss shows the answer here; a win already has the same one.
        dispatch({ type: "reveal", answer: loaded.answer });
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [state.status, puzzle.id, dispatch]);

  // "Give up" asks again for a few seconds, then goes back to asking once.
  useEffect(() => {
    if (!confirmGiveUp) return;
    const timer = window.setTimeout(() => setConfirmGiveUp(false), GIVE_UP_CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmGiveUp]);

  const frames = useMemo(
    () => (solution ? new Map<string, FrameInfo>(solution.frames.map((f) => [f.tileId, f])) : null),
    [solution],
  );

  /** Plays a miss, skip or win, and moves the view along with the game. */
  function apply(action: CollageAction) {
    const next = collageReducer(state, action);
    if (next === state) return;
    dispatch(action);
    setPicked(null);
    setPicking(false);
    setGuessError(null);
    setConfirmGiveUp(false);
    const nextRound = currentRound(next);
    if (next.status === "won") {
      setCelebrate(true);
      return;
    }
    const missed = action.type === "guess" ? `Not ${action.text}.` : "Skipped.";
    if (next.status === "lost") {
      announce(missed);
      return;
    }
    setEffect(action.type === "guess" ? "slip" : "swap");
    if (action.type === "guess") jolt(guessRow.current, SHAKE, 320);
    announce(`${missed} ${labels[nextRound]} is open.`);
  }

  async function guess(text: string, tmdbId?: number): Promise<boolean> {
    if (!playing || pending.current) return false;
    if (alreadyGuessed(state, text)) {
      const earlier = state.guesses.findIndex(
        (g) => g.text !== null && normalizeTitle(g.text) === normalizeTitle(text),
      );
      jolt(guessRow.current, SHAKE, 320);
      jolt(historyRow.current?.querySelector(`[data-guess="${earlier}"]`), PULSE, 360);
      announce(`Already guessed ${state.guesses[earlier]?.text ?? text}.`);
      return false;
    }
    pending.current = true;
    setGuessError(null);
    try {
      const result = await guessCollage(puzzle.id, text, tmdbId);
      apply(
        result.correct
          ? { type: "guess", text, correct: true, answer: result.answer }
          : { type: "guess", text, correct: false },
      );
      return true;
    } catch {
      setGuessError("Couldn't check that guess. Try again.");
      return false;
    } finally {
      pending.current = false;
    }
  }

  function skip() {
    if (!playing || pending.current) return;
    if (round === last && !confirmGiveUp) {
      setConfirmGiveUp(true);
      announce("Press again to give up.");
      return;
    }
    apply({ type: "skip" });
  }

  function togglePicking() {
    if (picking) return stopPicking();
    setPicking(true);
    announce("Pick a close-up to widen.");
  }

  /** Leaves picking mode without enhancing; a focused tile button goes with it, so focus returns to the badge. */
  function stopPicking() {
    setPicking(false);
    const focused = document.activeElement;
    if (!focused || focused === document.body || document.getElementById(PANEL_ID)?.contains(focused)) {
      document.getElementById(ENHANCE_ID)?.focus();
    }
  }

  function enhanceTile(tileId: string) {
    dispatch({ type: "enhance", tileId });
    setPicking(false);
    setFreshEnhance(true);
    announce("Close-up widened.");
    // The tile buttons go with picking mode, so focus goes to the collage itself.
    document.getElementById(PANEL_ID)?.focus({ preventScroll: true });
  }

  function showKeyword(index: number) {
    if (index === view) return;
    setPicked({ index, round, status: state.status });
    setEffect("swap");
    setFreshEnhance(false);
  }

  // The next keyword's close-ups load in the background once the open ones are in.
  function preloadNext() {
    const next = round + 1;
    if (!playing || view !== round || next > last || preloaded.current.has(next)) return;
    preloaded.current.add(next);
    for (const tile of puzzle.keywords[next].tiles) new Image().src = tile.imageUrl;
  }

  const giveUpLabel = confirmGiveUp ? "Give up?" : "Give up";

  return (
    <>
      <TopBar date={puzzle.date} onHelp={() => setHelpOpen(true)} />
      <main className="closeups-stage flex min-h-0 flex-1 flex-col items-center px-4 pb-4 pt-1 min-[700px]:justify-center min-[700px]:py-4">
        <div
          className="closeups-group flex flex-col gap-3"
          data-over={playing ? undefined : ""}
          onKeyDown={(event) => {
            if (event.key === "Escape" && picking) {
              event.stopPropagation();
              stopPicking();
            }
          }}
        >
          <section
            aria-label="Clues"
            className="relative rounded-2xl bg-sheet p-2 text-lamp shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_18px_40px_-18px_rgb(0_0_0/0.6)]"
          >
            <KeywordStrip
              labels={labels}
              round={round}
              status={state.status}
              view={view}
              onView={showKeyword}
              onLockedPress={() => jolt(guessRow.current?.querySelector("button"), PULSE, 300)}
            />
            <div className="relative mt-2">
              {playing && <EnhanceBadge pressed={picking} used={state.enhanced !== null} onPress={togglePicking} />}
              <CollageGrid
                key={view}
                keyword={puzzle.keywords[view]}
                index={view}
                enhancedTileId={state.enhanced}
                freshEnhance={freshEnhance}
                picking={picking && playing}
                onPick={enhanceTile}
                frames={playing ? null : frames}
                effect={effect}
                onLoaded={preloadNext}
              />
            </div>
          </section>

          {/* As tall as what it holds at its tallest (see .closeups-group in globals.css), so the board never jumps mid-game. */}
          <div className="closeups-below flex flex-col gap-3">
            {playing ? (
              <>
                <div ref={guessRow}>
                  <TitleGuess
                    onGuess={guess}
                    placeholder="Name the film…"
                    emptyAction={{ label: round === last ? giveUpLabel : "Skip", onPress: skip }}
                  />
                </div>
                <div ref={historyRow}>
                  {guessError ? (
                    <p
                      role="alert"
                      className="flex h-[30px] items-center justify-center text-sm font-semibold text-marker"
                    >
                      {guessError}
                    </p>
                  ) : (
                    <GuessHistory guesses={state.guesses} />
                  )}
                </div>
              </>
            ) : (
              <ResultPanel puzzle={puzzle} state={state} />
            )}
          </div>
        </div>
        <p role="status" className="sr-only">
          {announcement && <span key={announcement.id}>{announcement.text}</span>}
        </p>
      </main>
      {celebrate && <Confetti />}
      <HelpDialog
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false);
          writeJson(HELP_SEEN_KEY, true);
        }}
      />
    </>
  );
}

function TopBar({ date, onHelp }: { date?: string | null; onHelp?: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2">
      <Link href="/" aria-label="All games" className="grid size-11 place-items-center rounded-full hover:bg-ink/8">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="font-display text-[30px] font-[900] leading-none tracking-[-0.005em]">Close-Ups</h1>
        {closeUpsNumber(date ?? null) && (
          <span className="font-condensed text-[15px] font-bold text-ink-soft">#{closeUpsNumber(date ?? null)}</span>
        )}
      </div>
      <Link
        href={SITE.games.closeUpsArchive}
        aria-label="Previous days"
        title="Previous days"
        className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-ink/8"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </Link>
      {onHelp && (
        <button
          type="button"
          onClick={onHelp}
          aria-label="How to play"
          className="mr-1.5 grid size-[34px] shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-display text-xl font-[900] leading-none hover:bg-ink/8"
        >
          ?
        </button>
      )}
    </header>
  );
}
