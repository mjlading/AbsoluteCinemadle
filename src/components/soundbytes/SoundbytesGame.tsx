"use client";

import "./soundbytes.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/game/Confetti";
import { GameTopBar } from "@/components/game/GameTopBar";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { GuessHistory } from "@/components/collage/GuessHistory";
import { SITE } from "@/config/site";
import { localIsoDate } from "@/lib/dates";
import { ApiError } from "@/lib/game/api";
import { readJson, usePersistentReducer, writeJson } from "@/lib/game/storage";
import { fetchBoardSolution, fetchSoundbytesDay, guessBoard } from "@/lib/soundbytes/api";
import { soundbytesNumber } from "@/lib/soundbytes/day";
import {
  correctActors,
  initialSoundbytesState,
  lineMarks,
  linesOpen,
  soundbytesReducer,
  type SoundbytesAction,
} from "@/lib/soundbytes/state";
import type { GuessPick, PublicSoundbytesBoard, SoundNode } from "@/lib/soundbytes/types";
import { AudioNode } from "./AudioNode";
import { EvidenceBoard } from "./EvidenceBoard";
import { GuessBox } from "./GuessBox";
import { HelpDialog } from "./HelpDialog";
import { SLOTS } from "./layout";
import { ResultPanel } from "./ResultPanel";
import { useClipPlayer } from "./use-clip-player";

/** Set once a player has seen the tap hint, on any board. */
const HINT_SEEN_KEY = "soundbytes:hint-seen";
const HELP_SEEN_KEY = "soundbytes:help-seen";
const GIVE_UP_CONFIRM_MS = 3000;

/** Saved games of the points-and-buying version have another shape; this keeps them from being read back. */
const SAVE_VERSION = "tries-1";

const TITLE = "Soundbytes";

/**
 * Loads one day's board, then plays it; progress is kept on this device.
 * Without a date it is today's board, by the player's own calendar.
 */
export function SoundbytesGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicSoundbytesBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    // A day still ahead of the player's own calendar stays closed, even when the server would allow it.
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchSoundbytesDay(date ?? today)).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? date
                ? "There's no Soundbytes for that day."
                : "No Soundbytes today. Come back tomorrow."
              : "Couldn't load the board. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!board) {
    return (
      <>
        <GameTopBar title={TITLE} number={null} archiveHref={SITE.games.soundbytesArchive} />
        <main className="flex flex-1 items-start justify-center px-4 pt-16">
          {error ? (
            <div className="text-center">
              <p>{error}</p>
              <Link
                href={SITE.games.soundbytesArchive}
                className="mt-3 inline-block font-semibold underline underline-offset-4"
              >
                Previous days
              </Link>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-ink-soft">
              <ReelSpinner className="size-5" /> Loading the board&hellip;
            </p>
          )}
        </main>
      </>
    );
  }
  return <SoundbytesPlay key={board.id} board={board} />;
}

function SoundbytesPlay({ board }: { board: PublicSoundbytesBoard }) {
  const signature = useMemo(() => [SAVE_VERSION, ...board.nodes.map((n) => n.id)].join(","), [board]);
  const reducer = useMemo(() => soundbytesReducer(board), [board]);
  const [state, dispatch] = usePersistentReducer(
    `soundbytes:${board.id}`,
    signature,
    reducer,
    undefined,
    initialSoundbytesState,
  );
  const player = useClipPlayer();
  const [pending, setPending] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [announcement, setAnnouncement] = useState<{ id: number; text: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(() => readJson(HELP_SEEN_KEY) === null);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  // This component only mounts in the browser, after the board loads, so storage can be read here.
  const [hintSeen, setHintSeen] = useState(() => readJson<boolean>(HINT_SEEN_KEY) === true);
  const announcements = useRef(0);

  const playing = state.status === "playing";
  const open = linesOpen(board, state);
  const marks = lineMarks(board, state);
  const onLastLine = open === board.nodes.length;
  const first = board.nodes[0];

  const announce = (text: string) => setAnnouncement({ id: ++announcements.current, text });

  const markHintSeen = () => {
    if (hintSeen) return;
    setHintSeen(true);
    writeJson(HINT_SEEN_KEY, true);
  };

  // A loss reveals the answer; a win already carries it.
  useEffect(() => {
    if (state.status !== "playing" && !state.answer) {
      fetchBoardSolution(board.id).then(
        ({ answer }) => dispatch({ type: "show_answer", answer }),
        () => {},
      );
    }
  }, [state.status, state.answer, board.id, dispatch]);

  const { stop } = player;
  useEffect(() => {
    if (!playing) stop();
  }, [playing, stop]);

  // "Give up" asks again for a few seconds, then goes back to asking once.
  useEffect(() => {
    if (!confirmGiveUp) return;
    const timer = window.setTimeout(() => setConfirmGiveUp(false), GIVE_UP_CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmGiveUp]);

  /** Plays a try; a miss (described by `missed`) also says which line it opened. */
  function apply(action: SoundbytesAction, missed: string | null) {
    const next = reducer(state, action);
    if (next === state) return;
    dispatch(action);
    setConfirmGiveUp(false);
    setGuessError(null);
    if (next.status === "won") return setCelebrate(true);
    if (missed === null) return;
    if (next.status === "lost") return announce(missed);
    announce(`${missed} Line ${linesOpen(board, next)} is open.`);
  }

  function tapNode(node: SoundNode) {
    if (!state.started) {
      if (node.slot !== 0) return;
      markHintSeen();
      dispatch({ type: "start" });
      player.toggle(node.id, node.clip);
      return;
    }
    if (node.slot >= open) {
      announce(`${node.label} is still locked.`);
      return;
    }
    player.toggle(node.id, node.clip);
  }

  function skip() {
    if (!playing || pending) return;
    if (onLastLine && !confirmGiveUp) {
      setConfirmGiveUp(true);
      announce("Press again to give up.");
      return;
    }
    apply({ type: "skip" }, "Skipped.");
  }

  async function guess(pick: GuessPick) {
    const name = pick.kind === "film" ? pick.title : pick.name;
    const earlier = state.guesses.findIndex((g) => g.kind === pick.kind && g.tmdbId === pick.tmdbId);
    if (earlier >= 0) {
      setShakeKey((k) => k + 1);
      document
        .querySelector(`[data-guess="${earlier}"]`)
        ?.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], 360);
      announce(`Already guessed ${name}.`);
      return;
    }
    setPending(true);
    setGuessError(null);
    try {
      const result = await guessBoard(board.id, pick);
      if (result.correct && result.kind === "film") {
        apply({ type: "guess", pick, correct: true, answer: result.answer }, null);
      } else if (result.correct) {
        apply({ type: "guess", pick, correct: true }, null);
        announce(`${result.name} is in it. Pinned to the board.`);
      } else {
        apply({ type: "guess", pick, correct: false }, `Not ${name}.`);
        setShakeKey((k) => k + 1);
      }
    } catch {
      setGuessError("Couldn't check that guess. Try again.");
    } finally {
      setPending(false);
    }
  }

  // The history chips are Close-Ups' own: misses struck through, skips in italics; right actors live on the board.
  const history = state.guesses.map((g) =>
    g.kind === "skip" ? { text: null, correct: false } : { text: g.name, correct: g.correct },
  );

  return (
    <>
      <GameTopBar
        title={TITLE}
        number={soundbytesNumber(board.date)}
        archiveHref={SITE.games.soundbytesArchive}
        onHelp={() => setHelpOpen(true)}
      />
      <main className="sb-stage flex min-h-0 flex-1 flex-col items-center px-4 pb-4 pt-1 min-[700px]:justify-center min-[700px]:py-4">
        <div className="sb-group flex flex-col gap-3" data-over={playing ? undefined : ""}>
          <EvidenceBoard
            tags={correctActors(state).map((g) => g.name)}
            covered={playing && !state.started}
            progressRef={player.progressTarget}
          >
            {board.nodes.map((node) => {
              const locked = node.slot >= open;
              const isPlaying = player.playing?.nodeId === node.id;
              return (
                <AudioNode
                  key={node.id}
                  node={node}
                  slot={SLOTS[node.slot] ?? SLOTS[0]}
                  locked={locked}
                  mark={marks[node.slot]}
                  playing={isPlaying}
                  raised={!state.started && node.slot === 0}
                  inactive={playing && !state.started && node.slot !== 0}
                  hint={!hintSeen && !helpOpen && playing && !state.started && node.id === first.id ? "tap" : null}
                  label={nodeLabel(node, locked, isPlaying, state.started)}
                  onTap={() => tapNode(node)}
                />
              );
            })}
          </EvidenceBoard>

          {/* As tall as what it holds at its tallest (see .sb-group in soundbytes.css), so the board never jumps. */}
          <div className="sb-below flex flex-col gap-3">
            {playing ? (
              <>
                <GuessBox
                  disabled={!state.started || pending}
                  shakeKey={shakeKey}
                  onPick={guess}
                  action={{ label: onLastLine ? (confirmGiveUp ? "Give up?" : "Give up") : "Skip", onPress: skip }}
                />
                {guessError ? (
                  <p
                    role="alert"
                    className="flex h-[30px] items-center justify-center text-sm font-semibold text-marker"
                  >
                    {guessError}
                  </p>
                ) : (
                  <GuessHistory guesses={history} />
                )}
              </>
            ) : (
              <ResultPanel board={board} state={state} />
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

function nodeLabel(node: SoundNode, locked: boolean, isPlaying: boolean, started: boolean): string {
  // Dialogue lines and the theme are named by their labels ("Line 2", "Theme"); only effects say what they are.
  const what = node.category === "sfx" ? `${node.label}, sound effect` : node.label;
  if (!started) return `${what}. Tap to start, with sound on.`;
  if (locked) return `${what}, locked`;
  return `${what}${isPlaying ? ", playing" : ""}. Tap to play.`;
}
