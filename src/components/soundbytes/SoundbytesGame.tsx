"use client";

import "./soundbytes.css";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/game/Confetti";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { CloseButton, Dialog } from "@/components/ui/Dialog";
import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { ApiError } from "@/lib/game/api";
import { readJson, usePersistentReducer, writeJson } from "@/lib/game/storage";
import { fetchBoard, fetchBoardList, fetchBoardSolution, guessBoard } from "@/lib/soundbytes/api";
import {
  alreadyGuessed,
  canAfford,
  correctActors,
  guessesLeft,
  holdCost,
  initialSoundbytesState,
  nodeStage,
  soundbytesReducer,
  soundbytesScore,
  type SoundbytesState,
} from "@/lib/soundbytes/state";
import type { GuessPick, PublicSoundNode, PublicSoundbytesBoard, SoundCategory } from "@/lib/soundbytes/types";
import { AudioNode } from "./AudioNode";
import { EvidenceBoard } from "./EvidenceBoard";
import { GuessBox } from "./GuessBox";
import { CoinIcon, FlagIcon, PersonIcon } from "./icons";
import { SLOTS } from "./layout";
import { useClipPlayer } from "./use-clip-player";
import { useHold } from "./use-hold";

/** Set once a player has seen the tap-and-hold hint, on any board. */
const HINT_SEEN_KEY = "soundbytes:hint-seen";

const CATEGORY_NAME: Record<SoundCategory, string> = { dialogue: "dialogue", score: "music", sfx: "sound effect" };

/** Loads a board, then plays it; progress is kept on this device. */
export function SoundbytesGame({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<PublicSoundbytesBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBoard(boardId).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          reason instanceof ApiError && reason.status === 404
            ? "There's no such board."
            : "Couldn't load the board. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  if (error) return <p className="mt-10 text-center">{error}</p>;
  if (!board) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-ink-soft">
        <ReelSpinner className="size-5" /> Loading the board&hellip;
      </p>
    );
  }
  return <SoundbytesPlay key={board.id} board={board} />;
}

function SoundbytesPlay({ board }: { board: PublicSoundbytesBoard }) {
  const signature = useMemo(() => board.nodes.map((n) => n.id).join(","), [board]);
  const reducer = useMemo(() => soundbytesReducer(board), [board]);
  const [state, dispatch] = usePersistentReducer(
    `soundbytes:${board.id}`,
    signature,
    reducer,
    board,
    initialSoundbytesState,
  );
  const player = useClipPlayer();
  const [pending, setPending] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  // This component only mounts in the browser, after the board loads, so storage can be read here.
  const [hintSeen, setHintSeen] = useState(() => readJson<boolean>(HINT_SEEN_KEY) === true);

  const score = soundbytesScore(board, state);
  const playing = state.status === "playing";
  const free = board.nodes.find((n) => n.free) ?? board.nodes[0];

  const markHintSeen = () => {
    if (hintSeen) return;
    setHintSeen(true);
    writeJson(HINT_SEEN_KEY, true);
  };

  // A loss reveals the answer; a win already carries it.
  useEffect(() => {
    if (state.status === "lost" && !state.answer) {
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

  function tapNode(node: PublicSoundNode) {
    if (!state.started) {
      if (!node.free) return;
      dispatch({ type: "start" });
      player.toggle(node.id, node.clips.disguised);
      return;
    }
    const stage = nodeStage(state, node.id);
    if (playing && stage === "locked") {
      setAnnouncement(`${node.label} is locked. Hold it to buy it for ${node.buyCost} points.`);
      return;
    }
    const version = !playing || stage === "revealed" ? "real" : "disguised";
    player.toggle(node.id, node.clips[version]);
  }

  function holdNode(node: PublicSoundNode) {
    const stage = nodeStage(state, node.id);
    const cost = holdCost(board, state, node.id) ?? 0;
    if (player.playing?.nodeId === node.id) player.stop();
    markHintSeen();
    if (stage === "locked") {
      dispatch({ type: "buy", nodeId: node.id });
      setAnnouncement(`Bought ${node.label}. ${score - cost} points left. Tap it to play.`);
    } else if (stage === "disguised") {
      dispatch({ type: "reveal", nodeId: node.id });
      setAnnouncement(`Disguise removed from ${node.label}. ${score - cost} points left.`);
    }
  }

  async function guess(pick: GuessPick) {
    if (alreadyGuessed(state, pick)) {
      setShakeKey((k) => k + 1);
      setAnnouncement("You already guessed that.");
      return;
    }
    setPending(true);
    markHintSeen();
    try {
      const result = await guessBoard(board.id, pick);
      const left = guessesLeft(state) - 1;
      if (result.correct && result.kind === "film") {
        dispatch({ type: "guess", pick, correct: true, answer: result.answer });
      } else if (result.correct) {
        dispatch({ type: "guess", pick, correct: true });
        setAnnouncement(
          `${result.name} is in it. Plus ${POINTS.soundbytes.perCorrectActor} points. ${left} ${left === 1 ? "guess" : "guesses"} left.`,
        );
      } else {
        dispatch({ type: "guess", pick, correct: false });
        setShakeKey((k) => k + 1);
        setAnnouncement(left > 0 ? `Wrong. ${left} ${left === 1 ? "guess" : "guesses"} left.` : "Wrong.");
      }
    } catch {
      setShakeKey((k) => k + 1);
      setAnnouncement("Couldn't check that guess. Try again.");
    } finally {
      setPending(false);
    }
  }

  const hintFor = (node: PublicSoundNode): "tap" | "hold" | null => {
    if (hintSeen || !playing || node.id !== free.id) return null;
    if (!state.started) return "tap";
    return nodeStage(state, node.id) === "disguised" && player.playing === null ? "hold" : null;
  };

  return (
    <div className="mt-3">
      <h1 className="sr-only">Soundbytes, {board.name}</h1>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {playing ? (
        <Hud
          score={score}
          state={state}
          onHelp={() => setHelpOpen(true)}
          onGiveUp={() => {
            markHintSeen();
            dispatch({ type: "give_up" });
          }}
        />
      ) : (
        <GameOver board={board} state={state} score={score} onHelp={() => setHelpOpen(true)} />
      )}

      <div className="mt-3">
        <EvidenceBoard
          tags={correctActors(state).map((g) => g.name)}
          covered={playing && !state.started}
          progressRef={player.progressTarget}
        >
          {board.nodes.map((node) => {
            const stage = playing ? nodeStage(state, node.id) : "revealed";
            const version = !playing || stage === "revealed" ? "real" : "disguised";
            // Prices show from the start, even though nothing can be bought before the first tap.
            const cost = !playing
              ? null
              : stage === "locked"
                ? node.buyCost
                : stage === "disguised"
                  ? node.revealCost
                  : null;
            const isPlaying = player.playing?.nodeId === node.id;
            return (
              <AudioNode
                key={node.id}
                node={node}
                slot={SLOTS[node.slot] ?? SLOTS[0]}
                stage={stage}
                version={version}
                playing={isPlaying}
                cost={cost}
                verdict={() =>
                  holdCost(board, state, node.id) === null
                    ? "none"
                    : canAfford(board, state, node.id)
                      ? "spend"
                      : "refuse"
                }
                raised={!state.started && node.free}
                inactive={playing && !state.started && !node.free}
                hint={hintFor(node)}
                label={nodeLabel(node, stage, version, cost, isPlaying, state.started)}
                onTap={() => tapNode(node)}
                onHold={() => holdNode(node)}
              />
            );
          })}
        </EvidenceBoard>
      </div>

      {playing && (
        <div className="mt-4">
          <GuessBox disabled={!state.started || pending} shakeKey={shakeKey} onPick={guess} />
        </div>
      )}
      {!playing && <MoreBoards currentId={board.id} />}
    </div>
  );
}

function nodeLabel(
  node: PublicSoundNode,
  stage: ReturnType<typeof nodeStage>,
  version: "disguised" | "real",
  cost: number | null,
  isPlaying: boolean,
  started: boolean,
): string {
  const what = `${node.label}, ${CATEGORY_NAME[node.category]}`;
  if (!started) return `${what}. Tap to start, with sound on.`;
  const now = isPlaying ? ", playing" : "";
  if (stage === "locked") return `${what}, locked. Hold to buy for ${cost} points.`;
  if (version === "disguised") {
    return `${what}, disguised clip${now}. Tap to play, hold to remove the disguise for ${cost} points.`;
  }
  return `${what}, real clip${now}. Tap to play.`;
}

/** Points, guesses left and the white flag: icons and numbers only. */
function Hud({
  score,
  state,
  onHelp,
  onGiveUp,
}: {
  score: number;
  state: SoundbytesState;
  onHelp: () => void;
  onGiveUp: () => void;
}) {
  const max = RULES.soundbytes.maxGuesses;
  const left = guessesLeft(state);
  return (
    <div className="flex items-center gap-3">
      <PointsCounter score={score} />
      <div className="ml-auto flex items-center gap-1.5" role="img" aria-label={`${left} of ${max} guesses left`}>
        {Array.from({ length: max }, (_, i) => {
          const used = state.guesses[i];
          if (!used) return <span key={i} className="size-3.5 rounded-full bg-ink" />;
          if (used.correct) {
            return (
              <span key={i} className="grid size-3.5 place-items-center rounded-full bg-[var(--tier-1)] text-on-tape">
                <PersonIcon className="size-2.5" />
              </span>
            );
          }
          return (
            <span key={i} className="grid size-3.5 place-items-center rounded-full ring-[1.5px] ring-marker">
              <svg viewBox="0 0 10 10" className="size-2 text-marker" aria-hidden="true">
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          );
        })}
      </div>
      <GiveUpButton disabled={!state.started} onGiveUp={onGiveUp} />
      <HelpButton onClick={onHelp} />
    </div>
  );
}

/** The points count, with a brief floating "+150" or "−100" when it changes. */
function PointsCounter({ score }: { score: number }) {
  const [shown, setShown] = useState(score);
  const [delta, setDelta] = useState<{ value: number; id: number } | null>(null);
  if (shown !== score) {
    setDelta({ value: score - shown, id: (delta?.id ?? 0) + 1 });
    setShown(score);
  }
  return (
    <p className="relative flex items-center gap-1.5" aria-label={`${score} points`}>
      <CoinIcon className="size-7" />
      <span className="font-display text-[2.4rem] font-[900] leading-none tabular-nums" aria-hidden="true">
        {score}
      </span>
      {delta && (
        <span
          key={delta.id}
          aria-hidden="true"
          className={`sb-delta absolute left-full top-0 ml-1 font-condensed text-lg font-bold ${delta.value > 0 ? "text-[#2a8ea1]" : "text-marker"}`}
        >
          {delta.value > 0 ? `+${delta.value}` : `−${-delta.value}`}
        </span>
      )}
    </p>
  );
}

/** Giving up is a hold too, so it never happens by accident; the flag waves while it is held. */
function GiveUpButton({ disabled, onGiveUp }: { disabled: boolean; onGiveUp: () => void }) {
  const [nudged, setNudged] = useState(0);
  const hold = useHold({
    ms: RULES.soundbytes.holdMs,
    verdict: () => (disabled ? "none" : "spend"),
    onTap: () => setNudged((n) => n + 1),
    onComplete: onGiveUp,
    onRefuse: () => {},
  });
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label="Give up: press and hold"
      data-holding={hold.holding || undefined}
      className="sb-flag relative grid size-11 shrink-0 touch-manipulation select-none place-items-center rounded-full border-[1.5px] border-ink text-ink hover:bg-ink/5 disabled:opacity-35"
      {...hold.handlers}
    >
      <FlagIcon key={nudged} raise className={`size-6 ${nudged > 0 ? "sb-shake" : ""}`} />
      <svg viewBox="0 0 44 44" className="pointer-events-none absolute inset-[-1.5px] size-11" aria-hidden="true">
        <circle className="sb-flag-ring" cx="22" cy="22" r="20.5" pathLength={1} />
      </svg>
    </button>
  );
}

function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-display text-2xl font-[850] hover:bg-ink/5"
      aria-label="How to play"
    >
      ?
    </button>
  );
}

function GameOver({
  board,
  state,
  score,
  onHelp,
}: {
  board: PublicSoundbytesBoard;
  state: SoundbytesState;
  score: number;
  onHelp: () => void;
}) {
  const won = state.status === "won";
  const answer = state.answer;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <>
      {won && <Confetti />}
      <section aria-labelledby="result-heading" className="overflow-hidden rounded-[6px] bg-sheet px-5 py-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-white/65">
            {won ? "You got it" : guessesLeft(state) <= 0 ? "Out of guesses" : "You gave up"}
          </p>
          <button
            type="button"
            onClick={onHelp}
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-white/70 font-display text-xl font-[850] hover:bg-white/10"
            aria-label="How to play"
          >
            ?
          </button>
        </div>
        <div className="mt-1 flex items-center gap-4">
          {answer?.posterUrl && (
            <Image
              src={answer.posterUrl}
              alt=""
              width={74}
              height={111}
              unoptimized
              className="h-[111px] w-[74px] shrink-0 rounded-[3px] object-cover"
            />
          )}
          <div className="min-w-0">
            <h2
              id="result-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-[2.4rem] font-[900] leading-[0.9] text-balance outline-none"
            >
              {answer ? answer.title : "…"}
            </h2>
            {answer?.year && <p className="mt-1 text-white/65">{answer.year}</p>}
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["Points", score],
              ["Clips bought", `${state.bought.length} of ${board.nodes.length}`],
              ["Guesses", `${state.guesses.length} of ${RULES.soundbytes.maxGuesses}`],
            ] as const
          ).map(([name, value]) => (
            <div key={name} className="rounded-[4px] bg-white/8 px-2 py-2.5">
              <dt className="text-xs text-white/65">{name}</dt>
              <dd className="font-display text-2xl font-[850] leading-tight tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-white/70">Every clip now plays in full. Tap one to listen back.</p>
      </section>
    </>
  );
}

function MoreBoards({ currentId }: { currentId: string }) {
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetchBoardList().then(
      ({ boards }) => setOthers(boards.filter((b) => b.id !== currentId)),
      () => {},
    );
  }, [currentId]);
  if (others.length === 0) return null;
  return (
    <nav aria-label="Other boards" className="mt-8">
      <h2 className="font-semibold">Play another</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {others.map((b) => (
          <li key={b.id}>
            <Link
              href={`/soundbytes/${b.id}`}
              className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-5 font-semibold hover:bg-ink/5"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { maxGuesses } = RULES.soundbytes;
  const { start, buy, reveal, perCorrectActor } = POINTS.soundbytes;
  return (
    <Dialog open={open} onClose={onClose} labelledBy="sb-help-title" className="max-w-md bg-surface text-ink">
      <div className="flex items-start justify-between gap-4">
        <h2 id="sb-help-title" className="font-display text-3xl font-[850] leading-none">
          How to play
        </h2>
        <CloseButton onClick={onClose} />
      </div>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-snug text-pretty">
        <li>Guess the film from its sounds. Turn your sound on.</li>
        <li>Tap a record to play its clip, and tap again to stop.</li>
        <li>
          Clips start disguised: voices on helium, music on a kazoo, sound effects behind a door. The big record in the
          middle is free.
        </li>
        <li>
          You start with {start} points. Press and hold a locked record to buy it for {-buy}, and hold a disguise to
          remove it for {-reveal}.
        </li>
        <li>
          You have {maxGuesses} guesses, each a film or an actor. An actor from the film earns {perCorrectActor} points
          and is pinned to the board, but only the film wins.
        </li>
        <li>Points left when you name the film are your score. Give up or run out of guesses and it is 0.</li>
        <li>Your progress is saved on this device.</li>
      </ul>
    </Dialog>
  );
}
