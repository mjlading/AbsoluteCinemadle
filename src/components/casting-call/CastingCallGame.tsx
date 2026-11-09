"use client";

import "./casting-call.css";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Confetti } from "@/components/game/Confetti";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { RULES } from "@/config/rules";
import { SITE } from "@/config/site";
import { fetchCastingBoard, fetchCastingSolution, guessCastingFilm } from "@/lib/casting-call/api";
import {
  alreadyGuessed,
  castingCallReducer,
  guessesLeft,
  initialCastingCallState,
  msLeft,
  newlyCrossed,
  reviveCastingCallState,
  type CastingCallState,
} from "@/lib/casting-call/state";
import type { PublicCastingBoard } from "@/lib/casting-call/types";
import { ApiError, type FilmSuggestion } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";
import { FilmGuess } from "./FilmGuess";

export const castingStorageKey = (boardId: string) => `casting-call:${boardId}`;

/** Loads a board, then plays it; progress is kept on this device. */
export function CastingCallGame({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<PublicCastingBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCastingBoard(boardId).then(
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
        <ReelSpinner className="size-5" /> Loading the faces&hellip;
      </p>
    );
  }
  return <CastingCallPlay key={board.id} board={board} />;
}

type Feedback = { id: number; kind: "hit" | "miss"; message: string } | null;

function CastingCallPlay({ board }: { board: PublicCastingBoard }) {
  const signature = useMemo(() => board.faces.map((f) => f.id).join(","), [board]);
  const reducer = useMemo(() => castingCallReducer(board.faces.length), [board]);
  const [state, dispatch] = usePersistentReducer(
    castingStorageKey(board.id),
    signature,
    reducer,
    undefined,
    initialCastingCallState,
    reviveCastingCallState,
  );
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Faces crossed by the latest guess get the stamp animation; a reload shows them already crossed.
  const [fresh, setFresh] = useState<string[]>([]);

  const playing = state.status === "playing";
  const over = state.status === "won" || state.status === "lost";
  const crossed = new Set(state.crossed);
  const left = guessesLeft(state);
  const deadline = state.deadline;

  // The bar: ticks while playing and ends the game at zero, unless a film submitted in time is still being checked.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (!busy && deadline !== null && t >= deadline) dispatch({ type: "timeUp" });
    }, 200);
    return () => window.clearInterval(timer);
  }, [playing, busy, deadline, dispatch]);

  const miss = (message: string, id: number) => {
    setShakeKey((k) => k + 1);
    setFeedback({ id, kind: "miss", message });
  };

  // The names are only fetched now, so the clock is what pays for them.
  async function start() {
    if (state.status !== "ready" || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { faces } = await fetchCastingSolution(board.id);
      dispatch({ type: "start", now: Date.now(), faces });
    } catch {
      setFeedback({ id: Date.now(), kind: "miss", message: "The names couldn't be loaded. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function submit(choice: FilmSuggestion) {
    const id = Date.now();
    if (!playing || busy || msLeft(state, id) <= 0) return;
    if (alreadyGuessed(state, choice.tmdbId)) {
      miss(`You already tried ${choice.title}.`, id);
      return;
    }
    setBusy(true);
    try {
      const result = await guessCastingFilm(board.id, choice.tmdbId);
      dispatch({ type: "guess", now: id, result });
      const newOnes = result.found.filter((f) => !crossed.has(f.faceId));
      setFresh(newOnes.map((f) => f.faceId));
      if (result.found.length === 0) {
        miss(`Nobody on the board is in ${result.film.title}.`, id);
      } else if (newOnes.length === 0) {
        miss(`${result.film.title} only has actors you've already crossed out. The bar still refills.`, id);
      } else {
        setFeedback({
          id,
          kind: "hit",
          message: `${result.film.title}: ${newOnes.map((f) => f.name).join(", ")}`,
        });
      }
    } catch (error) {
      miss(error instanceof ApiError ? error.message : "That film couldn't be checked. Try again.", id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {state.status === "won" && <Confetti />}

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Casting call</p>
          <h1 className="mt-1 font-display text-4xl font-[900] leading-none">{board.name}</h1>
        </div>
        <div className="text-right">
          <GuessDots left={left} />
          <p className="mt-1 text-sm text-ink-soft">
            <strong className="text-ink">{crossed.size}</strong> of {board.faces.length} found
          </p>
        </div>
      </div>

      <ul aria-label="Faces" className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {board.faces.map((face, i) => (
          <FaceCard
            key={face.id}
            index={i}
            imageUrl={face.imageUrl}
            name={state.names[face.id] ?? null}
            crossed={crossed.has(face.id)}
            fresh={fresh.includes(face.id)}
            missed={state.status === "lost" && !crossed.has(face.id)}
            blurred={state.status === "ready"}
          />
        ))}
      </ul>

      <div className="mt-5">
        {state.status === "ready" ? (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-lg font-semibold text-table hover:opacity-90 disabled:opacity-60"
          >
            {busy && <ReelSpinner className="size-5" />} Start
          </button>
        ) : (
          <>
            {playing && <TimeBar ms={msLeft(state, now)} />}
            <FilmGuess
              disabled={over}
              busy={busy}
              shakeKey={shakeKey}
              onPick={submit}
              label="Guess a film"
              placeholder="A film with some of these actors"
              autoFocus={playing}
            />
          </>
        )}
        <p aria-live="polite" className="mt-2 flex min-h-6 items-center gap-2 text-sm">
          {busy ? (
            <span className="flex items-center gap-2 text-ink-soft">
              <ReelSpinner className="size-4" /> Checking the cast&hellip;
            </span>
          ) : feedback ? (
            <span
              key={feedback.id}
              className={`font-semibold ${feedback.kind === "miss" ? "text-marker" : "text-ink"}`}
            >
              {feedback.message}
            </span>
          ) : state.status === "ready" ? (
            <span className="text-ink-soft">
              Start reveals the {board.faces.length} faces and names and sets off a {RULES.castingCall.timeLimitSeconds}
              -second bar. Any film with someone from the board refills it. Cross out everyone within{" "}
              {RULES.castingCall.maxGuesses} guesses.
            </span>
          ) : state.guesses.length === 0 && playing ? (
            <span className="text-ink-soft">
              Name films these actors are in. Each film crosses out everyone on the board in its cast.
            </span>
          ) : null}
        </p>
      </div>

      {over && <EndPanel state={state} total={board.faces.length} />}

      {state.guesses.length > 0 && (
        <section aria-labelledby="cc-guesses" className="mt-6">
          <h2 id="cc-guesses" className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Your guesses
          </h2>
          <ol className="mt-2 flex flex-col gap-2">
            {state.guesses.map((g, i) => {
              const added = newlyCrossed(state, i);
              return (
                <li
                  key={g.film.tmdbId}
                  className="flex min-h-12 items-center gap-3 rounded-[6px] bg-surface px-3 py-2 ring-1 ring-ink/10"
                >
                  <span className="w-5 shrink-0 text-center font-display text-xl font-[850] text-ink-soft">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="font-semibold">{g.film.title}</span>
                    {g.film.year && <span className="ml-1.5 text-ink-soft">{g.film.year}</span>}
                    <span className="block text-sm text-ink-soft">
                      {g.faceIds.length === 0
                        ? "Nobody from the board"
                        : `${added.length} new${g.faceIds.length > added.length ? `, ${g.faceIds.length - added.length} already found` : ""}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 -space-x-2">
                    {g.faceIds.map((faceId) => {
                      const face = board.faces.find((f) => f.id === faceId);
                      return face ? (
                        <span
                          key={faceId}
                          className={`relative size-8 overflow-hidden rounded-full ring-2 ring-surface ${added.includes(faceId) ? "" : "opacity-50"}`}
                        >
                          <Image src={face.imageUrl} alt="" fill unoptimized sizes="2rem" className="object-cover" />
                        </span>
                      ) : null;
                    })}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

/** The countdown: a bar that drains, and turns red for the last stretch. */
function TimeBar({ ms }: { ms: number }) {
  const limit = RULES.castingCall.timeLimitSeconds * 1000;
  return (
    <div
      role="timer"
      aria-label={`${Math.ceil(ms / 1000)} seconds left`}
      className="mb-3 h-3 overflow-hidden rounded-full bg-ink/10"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-200 ease-linear ${ms <= 10_000 ? "bg-marker" : "bg-ink"}`}
        style={{ width: `${(ms / limit) * 100}%` }}
      />
    </div>
  );
}

function GuessDots({ left }: { left: number }) {
  const max = RULES.castingCall.maxGuesses;
  return (
    <p className="flex justify-end gap-1.5" aria-label={`${left} of ${max} guesses left`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`size-3.5 rounded-full ${i < left ? "bg-ink" : "bg-transparent ring-[1.5px] ring-inset ring-ink/30"}`}
        />
      ))}
    </p>
  );
}

function FaceCard({
  index,
  imageUrl,
  name,
  crossed,
  fresh,
  missed,
  blurred,
}: {
  index: number;
  imageUrl: string;
  name: string | null;
  crossed: boolean;
  fresh: boolean;
  missed: boolean;
  /** Before Start: the face can't be studied for free. */
  blurred: boolean;
}) {
  return (
    <li className="min-w-0">
      <div
        className={`relative aspect-square overflow-hidden rounded-[6px] bg-sheet ring-1 ring-ink/15 ${
          crossed && fresh ? "ccall-stamp" : ""
        }`}
      >
        <Image
          src={imageUrl}
          alt={crossed ? `${name}, crossed out` : (name ?? `Face ${index + 1}`)}
          fill
          unoptimized
          sizes="(min-width: 640px) 8rem, 25vw"
          className={`object-cover transition-[filter,scale] duration-500 ${crossed ? "grayscale-[0.6] brightness-75" : ""} ${blurred ? "scale-125 blur-xl" : ""}`}
        />
        {crossed && <MarkerCross animate={fresh} />}
      </div>
      <p
        className={`mt-1 line-clamp-2 min-h-[2.2em] text-center text-xs font-semibold leading-tight ${
          missed
            ? "text-marker"
            : crossed
              ? "text-ink-soft line-through decoration-marker decoration-2"
              : name
                ? "text-ink"
                : "text-ink-soft"
        }`}
      >
        {name ?? "?"}
      </p>
    </li>
  );
}

/** A hand-drawn china-marker cross over a found face. */
function MarkerCross({ animate }: { animate: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`ccall-cross pointer-events-none absolute inset-0 size-full ${animate ? "ccall-cross-draw" : ""}`}
    >
      <path pathLength={1} d="M16 18 C38 40 60 62 85 84" />
      <path pathLength={1} d="M84 16 C62 40 40 60 15 86" />
    </svg>
  );
}

function EndPanel({ state, total }: { state: CastingCallState; total: number }) {
  const won = state.status === "won";
  const used = state.guesses.length;
  return (
    <section aria-labelledby="ccall-end" className="mt-5 rounded-lg bg-surface p-5 ring-1 ring-ink/15">
      <h2 id="ccall-end" className="font-display text-4xl font-[900] leading-none">
        {won ? "That's a wrap!" : state.timedOut ? "Time's up" : "Out of guesses"}
      </h2>
      <p className="mt-2 leading-snug">
        {won
          ? `All ${total} actors in ${used} ${used === 1 ? "guess" : "guesses"}.`
          : `You found ${state.crossed.length} of ${total}. The ones you missed are in red.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={SITE.games.castingCall}
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 font-semibold text-table hover:opacity-90"
        >
          Another board
        </Link>
      </div>
    </section>
  );
}
