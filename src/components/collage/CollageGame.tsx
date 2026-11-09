"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/game/Confetti";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { CloseButton, Dialog } from "@/components/ui/Dialog";
import { TitleGuess } from "@/components/warmup/TitleGuess";
import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { fetchCollage, fetchCollageList, fetchCollageSolution, guessCollage } from "@/lib/collage/api";
import {
  alreadyGuessed,
  canUnlock,
  collageReducer,
  collageScore,
  guessesLeft,
  initialCollageState,
  type CollageState,
} from "@/lib/collage/state";
import type { CollageSolution, PublicCollageKeyword, PublicCollagePuzzle } from "@/lib/collage/types";
import { ApiError } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";
import { CollageGrid, ZoomOutTile, collageAlt, useAllLoaded } from "./CollageTiles";

/** Loads a puzzle, then plays it; progress is kept on this device. */
export function CollageGame({ puzzleId }: { puzzleId: string }) {
  const [puzzle, setPuzzle] = useState<PublicCollagePuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCollage(puzzleId).then(
      (loaded) => !cancelled && setPuzzle(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          reason instanceof ApiError && reason.status === 404
            ? "There's no such puzzle."
            : "Couldn't load the puzzle. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [puzzleId]);

  if (error) return <p className="mt-10 text-center">{error}</p>;
  if (!puzzle) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-ink-soft">
        <ReelSpinner className="size-5" /> Loading the puzzle&hellip;
      </p>
    );
  }
  return <CollagePlay key={puzzle.id} puzzle={puzzle} />;
}

function CollagePlay({ puzzle }: { puzzle: PublicCollagePuzzle }) {
  const signature = useMemo(() => puzzle.keywords.flatMap((k) => k.tiles.map((t) => t.id)).join(","), [puzzle]);
  const reducer = useMemo(() => collageReducer(puzzle), [puzzle]);
  const [state, dispatch] = usePersistentReducer(
    `collage:${puzzle.id}`,
    signature,
    reducer,
    puzzle,
    initialCollageState,
  );
  const [enhancing, setEnhancing] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // The keyword just bought; its heading takes focus as it mounts, so keyboard and screen-reader players land on it.
  const focusOnMount = useRef<string | null>(null);

  const score = collageScore(puzzle, state);
  const playing = state.status === "playing";
  const unlocked = state.unlocked.map((id) => puzzle.keywords.find((k) => k.id === id)).filter((k) => !!k);
  const locked = puzzle.keywords.filter((k) => !state.unlocked.includes(k.id));

  // A loss reveals the answer; a win already carries it.
  useEffect(() => {
    if (state.status === "lost" && !state.answer) {
      fetchCollageSolution(puzzle.id).then(
        ({ answer }) => dispatch({ type: "reveal", answer }),
        () => {},
      );
    }
  }, [state.status, state.answer, puzzle.id, dispatch]);

  async function guess(text: string, tmdbId?: number) {
    if (alreadyGuessed(state, text)) {
      setFeedback(`You already tried "${text}".`);
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      const result = await guessCollage(puzzle.id, text, tmdbId);
      if (result.correct) {
        dispatch({ type: "guess", text, correct: true, answer: result.answer });
      } else {
        dispatch({ type: "guess", text, correct: false });
        const left = guessesLeft(state) - 1;
        setFeedback(left > 0 ? `Not "${text}". ${left} ${left === 1 ? "guess" : "guesses"} left.` : `Not "${text}".`);
      }
    } catch {
      setFeedback("Couldn't check that guess. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">{puzzle.name}</p>
          <h1 className="font-display text-[2.6rem] font-[900] leading-[0.85] tracking-[-0.01em]">Close-Ups</h1>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-display text-2xl font-[850] hover:bg-ink/5"
          aria-label="How to play"
        >
          ?
        </button>
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {playing ? (
        <>
          <Scoreboard score={score} state={state} />
          <div className="mt-4 flex flex-col gap-4">
            {unlocked.map((keyword) => (
              <CollagePanel
                key={keyword.id}
                keyword={keyword}
                headingRef={(el) => {
                  if (el && focusOnMount.current === keyword.id) {
                    focusOnMount.current = null;
                    el.focus();
                  }
                }}
              >
                <CollageGrid
                  keyword={keyword}
                  enhancedTileId={state.enhanced}
                  enhancing={enhancing}
                  onEnhance={(tileId) => {
                    dispatch({ type: "enhance", tileId });
                    setEnhancing(false);
                  }}
                />
              </CollagePanel>
            ))}
          </div>

          <EnhanceControl
            used={state.enhanced !== null}
            enhancing={enhancing}
            onToggle={() => setEnhancing((on) => !on)}
          />

          <section aria-labelledby="guess-heading" className="mt-6">
            <h2 id="guess-heading" className="font-display text-3xl font-[850] leading-none">
              Which film is it?
            </h2>
            <div className="mt-3">
              <TitleGuess disabled={pending} onGuess={guess} placeholder="Movie title" autoFocus={false} clearOnGuess />
            </div>
            <p role="status" className="mt-2 min-h-6 font-semibold text-marker">
              {feedback}
            </p>
            {state.guesses.length > 0 && (
              <ul aria-label="Your guesses" className="mt-1 flex flex-wrap gap-2">
                {state.guesses.map((g) => (
                  <li key={g.text} className="rounded-full bg-ink/8 px-3 py-1 text-sm text-ink-soft line-through">
                    {g.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ClueBoard
            keywords={locked}
            canAfford={(id) => canUnlock(puzzle, state, id)}
            onUnlock={(id) => {
              focusOnMount.current = id;
              dispatch({ type: "unlock", keywordId: id });
              setEnhancing(false);
            }}
          />

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => dispatch({ type: "give_up" })}
              className="min-h-11 text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Give up and show the film
            </button>
          </div>
        </>
      ) : (
        <GameOver puzzle={puzzle} state={state} score={score} />
      )}

      <p className="mt-10 text-xs text-ink-soft">Film stills belong to their copyright holders.</p>
    </div>
  );
}

function Scoreboard({ score, state }: { score: number; state: CollageState }) {
  const left = guessesLeft(state);
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-[6px] bg-surface px-4 py-3 ring-1 ring-ink/10">
        <dt className="text-sm text-ink-soft">Points</dt>
        <dd className="font-display text-4xl font-[900] leading-none tabular-nums">{score}</dd>
      </div>
      <div className="rounded-[6px] bg-surface px-4 py-3 ring-1 ring-ink/10">
        <dt className="text-sm text-ink-soft">Guesses left</dt>
        <dd className="mt-1 flex items-center gap-1.5" aria-label={`${left} of ${RULES.keywordCollage.maxGuesses}`}>
          {Array.from({ length: RULES.keywordCollage.maxGuesses }, (_, i) => (
            <span key={i} aria-hidden="true" className={`size-3.5 rounded-full ${i < left ? "bg-ink" : "bg-ink/15"}`} />
          ))}
          <span aria-hidden="true" className="ml-1 font-display text-2xl font-[850] leading-none tabular-nums">
            {left}
          </span>
        </dd>
      </div>
    </dl>
  );
}

function CollagePanel({
  keyword,
  headingRef,
  children,
}: {
  keyword: PublicCollageKeyword;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`kw-${keyword.id}`} className="rounded-[6px] bg-sheet p-3 text-lamp sm:p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id={`kw-${keyword.id}`}
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl font-[850] leading-none outline-offset-4"
        >
          {keyword.label}
        </h2>
        <span className="shrink-0 text-sm text-lamp/70">{keyword.free ? "Free clue" : `${keyword.cost} points`}</span>
      </div>
      {children}
    </section>
  );
}

function EnhanceControl({ used, enhancing, onToggle }: { used: boolean; enhancing: boolean; onToggle: () => void }) {
  if (used) return <p className="mt-3 text-sm text-ink-soft">Enhance used.</p>;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={enhancing}
        onClick={onToggle}
        className={`min-h-11 rounded-full border-[1.5px] border-ink px-5 font-semibold ${enhancing ? "bg-ink text-table" : "hover:bg-ink/5"}`}
      >
        {enhancing ? "Cancel enhance" : "Enhance a close-up"}
      </button>
      <span className="text-sm text-ink-soft">
        {enhancing
          ? "Pick a close-up to widen."
          : `Free, once per game: widens one close-up by ${Math.round((RULES.keywordCollage.enhanceFactor - 1) * 100)}%.`}
      </span>
    </div>
  );
}

function ClueBoard({
  keywords,
  canAfford,
  onUnlock,
}: {
  keywords: PublicCollageKeyword[];
  canAfford: (id: string) => boolean;
  onUnlock: (id: string) => void;
}) {
  if (keywords.length === 0) return null;
  return (
    <section aria-labelledby="clues-heading" className="mt-8">
      <h2 id="clues-heading" className="font-display text-3xl font-[850] leading-none">
        More clues
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Each keyword opens four more close-ups. The more it gives away, the more it costs.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {keywords.map((k) => {
          const affordable = canAfford(k.id);
          return (
            <li key={k.id}>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => onUnlock(k.id)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[6px] bg-surface px-4 text-left ring-1 ring-ink/15 hover:ring-ink disabled:opacity-45 disabled:hover:ring-ink/15"
              >
                <span className="font-display text-2xl font-[850] leading-none">{k.label}</span>
                <span className="shrink-0 text-sm">
                  {affordable ? (
                    <>
                      Unlock <span className="font-semibold">&minus;{k.cost}</span>
                    </>
                  ) : (
                    `${k.cost} points: not enough left`
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GameOver({ puzzle, state, score }: { puzzle: PublicCollagePuzzle; state: CollageState; score: number }) {
  const [solution, setSolution] = useState<CollageSolution | null>(null);
  const won = state.status === "won";
  const answer = state.answer ?? solution?.answer ?? null;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCollageSolution(puzzle.id).then(
      (s) => !cancelled && setSolution(s),
      () => {},
    );
    headingRef.current?.focus();
    return () => {
      cancelled = true;
    };
  }, [puzzle.id]);

  const opened = state.unlocked.length;
  return (
    <>
      {won && <Confetti />}
      <section
        aria-labelledby="result-heading"
        className="mt-5 overflow-hidden rounded-[6px] bg-sheet px-5 py-6 text-white"
      >
        <p className="text-sm text-white/65">
          {won ? "You got it" : wrongOut(state) ? "Out of guesses" : "You gave up"}
        </p>
        <div className="mt-2 flex items-center gap-4">
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
              ["Keywords", `${opened} of ${puzzle.keywords.length}`],
              ["Guesses", state.guesses.length],
            ] as const
          ).map(([name, value]) => (
            <div key={name} className="rounded-[4px] bg-white/8 px-2 py-2.5">
              <dt className="text-xs text-white/65">{name}</dt>
              <dd className="font-display text-2xl font-[850] leading-tight tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {solution && <ZoomOutReveal puzzle={puzzle} solution={solution} unlocked={state.unlocked} />}
      <MorePuzzles currentId={puzzle.id} />
    </>
  );
}

const wrongOut = (state: CollageState) => guessesLeft(state) <= 0;

/** Every keyword's collage, the ones never opened included, pulling back to the full frames. */
function ZoomOutReveal({
  puzzle,
  solution,
  unlocked,
}: {
  puzzle: PublicCollagePuzzle;
  solution: CollageSolution;
  unlocked: string[];
}) {
  const frames = useMemo(() => new Map(solution.frames.map((f) => [f.tileId, f])), [solution]);
  const tileCount = puzzle.keywords.reduce((n, k) => n + k.tiles.length, 0);
  const { ready, onLoad } = useAllLoaded(tileCount);
  // Each replay is a new run: its tiles mount at the close-up, then pull back two frames later, once that has painted.
  const [run, setRun] = useState(0);
  const [zoomedRun, setZoomedRun] = useState(-1);
  const zoomed = ready && zoomedRun === run;

  useEffect(() => {
    if (!ready) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setZoomedRun(run));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [ready, run]);

  const ordered = [...puzzle.keywords].sort(
    (a, b) => Number(!unlocked.includes(a.id)) - Number(!unlocked.includes(b.id)),
  );
  return (
    <section aria-labelledby="frames-heading" className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 id="frames-heading" className="font-display text-3xl font-[850] leading-none">
          The full frames
        </h2>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="min-h-11 rounded-full border-[1.5px] border-ink px-4 text-sm font-semibold hover:bg-ink/5"
        >
          Zoom out again
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {ordered.map((keyword, k) => (
          <section key={keyword.id} aria-label={keyword.label} className="rounded-[6px] bg-sheet p-3 text-lamp sm:p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl font-[850] leading-none">{keyword.label}</h3>
              <span className="text-sm text-lamp/70">{unlocked.includes(keyword.id) ? "Opened" : "Never opened"}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {keyword.tiles.map((tile, i) => {
                const frame = frames.get(tile.id);
                if (!frame) return null;
                return (
                  <ZoomOutTile
                    key={`${tile.id}-${run}`}
                    frameUrl={frame.frameUrl}
                    crop={frame.crop}
                    aspect={frame.aspect}
                    zoomed={zoomed}
                    delayMs={k * 220 + i * 90}
                    alt={`${collageAlt(keyword, tile.number)}, full frame`}
                    onLoad={onLoad}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function MorePuzzles({ currentId }: { currentId: string }) {
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetchCollageList().then(
      ({ puzzles }) => setOthers(puzzles.filter((p) => p.id !== currentId)),
      () => {},
    );
  }, [currentId]);
  if (others.length === 0) return null;
  return (
    <nav aria-label="Other puzzles" className="mt-8">
      <h2 className="font-semibold">Play another</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {others.map((p) => (
          <li key={p.id}>
            <Link
              href={`/close-ups/${p.id}`}
              className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-5 font-semibold hover:bg-ink/5"
            >
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { maxGuesses, tilesPerCollage } = RULES.keywordCollage;
  const { start, perWrongGuess, unlock } = POINTS.keywordCollage;
  return (
    <Dialog open={open} onClose={onClose} labelledBy="collage-help-title" className="max-w-md bg-surface text-ink">
      <div className="flex items-start justify-between gap-4">
        <h2 id="collage-help-title" className="font-display text-3xl font-[850] leading-none">
          How to play
        </h2>
        <CloseButton onClick={onClose} />
      </div>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-snug text-pretty">
        <li>Guess the film from close-ups of its stills.</li>
        <li>
          Every collage shows {tilesPerCollage} close-ups that share one keyword, like &ldquo;Hands&rdquo;. The first
          one is free.
        </li>
        <li>
          You start with {start} points. Unlocking another keyword costs {-unlock.hard} to {-unlock.easy} points: the
          more its close-ups give away, the more it costs.
        </li>
        <li>
          A wrong guess costs {-perWrongGuess} points, and after {maxGuesses} wrong guesses the game is over.
        </li>
        <li>Once per game, Enhance widens one close-up for free.</li>
        <li>When the game ends, the close-ups zoom out to their full frames.</li>
        <li>Your progress is saved on this device.</li>
      </ul>
    </Dialog>
  );
}
