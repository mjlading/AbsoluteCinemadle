"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { Confetti } from "@/components/game/Confetti";
import { GameTopBar } from "@/components/game/GameTopBar";
import { Poster } from "@/components/game/Poster";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { ShareButton } from "@/components/game/ResultActions";
import { RULES } from "@/config/rules";
import { SITE } from "@/config/site";
import { addDays, formatPuzzleDate, isIsoDate, localIsoDate } from "@/lib/dates";
import { ApiError, request } from "@/lib/game/api";
import { readJson, writeJson } from "@/lib/game/storage";
import { HEAT, heatIndex, heatOf, tally, warmerNumber, warmerShareText } from "@/lib/warmer/heat";
import type { RankedFilm, WarmerClue, WarmerDay, WarmerFilm } from "@/lib/warmer/types";
import { FilmSearch } from "./FilmSearch";
import { Bulb, HelpDialog } from "./HelpDialog";
import "./warmer.css";

interface Saved {
  /** Guesses and hints, in the order they were played. */
  guesses: RankedFilm[];
  status: "playing" | "won" | "lost";
  answer: RankedFilm | null;
  clues?: WarmerClue[];
}

const TITLE = "Warmer";
const HELP_SEEN_KEY = "warmer:help-seen";
const FILM = HEAT.length - 1;
const CLUE_NAMES = { decade: "Decade", genres: "Genres" } as const;

const storageKey = (date: string) => `warmer:${date}`;
const post = <T,>(date: string, body: object) =>
  request<T>(`/api/warmer/day/${date}`, { method: "POST", body: JSON.stringify(body) });

const PILL =
  "flex h-9 items-center gap-1.5 rounded-full px-3.5 font-condensed text-[15px] font-extrabold tracking-[0.02em]";

/**
 * Loads a day's game, then plays it; progress is kept on this device.
 * The day is today by the player's own calendar, or an earlier one given as `?date=`.
 */
export function WarmerGame() {
  const [day, setDay] = useState<{ date: string; today: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const today = localIsoDate();
    const asked = new URLSearchParams(window.location.search).get("date");
    // A day still ahead of the player's own calendar stays closed.
    const date = asked && isIsoDate(asked) && asked < today ? asked : today;
    request<WarmerDay>(`/api/warmer/day/${date}`).then(
      ({ total }) => {
        setDay({ date, today, total });
        if (readJson(HELP_SEEN_KEY) === null) setHelpOpen(true);
      },
      (reason: unknown) =>
        setError(
          reason instanceof ApiError && reason.status !== 500
            ? reason.message
            : "Couldn't load the game. Check your connection and try again.",
        ),
    );
  }, []);

  if (!day) {
    return (
      <>
        <GameTopBar title={TITLE} number={null} />
        <main className="flex flex-1 justify-center px-4 pt-16">
          {error ? (
            <p className="text-center">{error}</p>
          ) : (
            <p className="flex items-center gap-2 text-ink-soft">
              <ReelSpinner className="size-5" /> Loading&hellip;
            </p>
          )}
        </main>
      </>
    );
  }
  return (
    <>
      <GameTopBar title={TITLE} number={warmerNumber(day.date)} onHelp={() => setHelpOpen(true)} />
      <main className="mx-auto w-full max-w-[34rem] flex-1 px-4 pb-10">
        <WarmerPlay date={day.date} total={day.total} />
        <DayStepper date={day.date} today={day.today} />
      </main>
      <HelpDialog
        open={helpOpen}
        total={day.total}
        onClose={() => {
          setHelpOpen(false);
          writeJson(HELP_SEEN_KEY, true);
        }}
      />
    </>
  );
}

function WarmerPlay({ date, total }: { date: string; total: number }) {
  const [saved, setSaved] = useState<Saved>(
    () => readJson<Saved>(storageKey(date)) ?? { guesses: [], status: "playing", answer: null },
  );
  /** The film in the reading, when it isn't simply the last one played; `n` restarts its animation. */
  const [focus, setFocus] = useState<{ id: number; repeat: boolean; n: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const played = saved.guesses;
  const over = saved.status !== "playing";
  const won = saved.status === "won";
  const clues = saved.clues ?? [];
  const guessCount = played.filter((g) => !g.hint).length;
  const tried = useMemo(() => new Map(played.map((g) => [g.film.id, g.rank])), [played]);
  const sorted = useMemo(() => [...played].sort((a, b) => a.rank - b.rank), [played]);
  const shown = (focus && played.find((g) => g.film.id === focus.id)) || played.at(-1) || null;
  const hits = new Set(played.map((g) => heatIndex(g.rank)));

  // The guess box had focus when the game ended (not on a reload), so focus moves to the film's name.
  useEffect(() => {
    if (over && moved.current) resultRef.current?.focus({ preventScroll: true });
  }, [over]);

  function save(next: Saved) {
    setSaved(next);
    writeJson(storageKey(date), next);
  }

  async function run<T>(body: object, then: (r: T) => void) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      then(await post<T>(date, body));
      moved.current = true;
    } catch (reason) {
      setMessage(reason instanceof ApiError ? reason.message : "Couldn't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const show = (id: number, repeat = false) => setFocus({ id, repeat, n: (focus?.n ?? 0) + 1 });

  function guess(film: WarmerFilm) {
    if (tried.has(film.id)) {
      setMessage(null);
      show(film.id, true);
      return;
    }
    void run<{ result: RankedFilm }>({ action: "guess", id: film.id }, ({ result }) => {
      const right = result.rank === 1;
      show(result.film.id);
      setCelebrate(right);
      save({
        ...saved,
        guesses: [...played, result],
        status: right ? "won" : "playing",
        answer: right ? result : null,
      });
    });
  }

  function hint() {
    void run<{ result: RankedFilm | null }>({ action: "hint", guessed: played.map((g) => g.film.id) }, ({ result }) => {
      if (!result) {
        setMessage("No hint is closer than your #2.");
        return;
      }
      show(result.film.id);
      save({ ...saved, guesses: [...played, result] });
    });
  }

  function clue(kind: WarmerClue["kind"]) {
    void run<{ clue: WarmerClue }>({ action: "clue", kind }, ({ clue }) => save({ ...saved, clues: [...clues, clue] }));
  }

  function giveUp() {
    void run<{ result: RankedFilm }>({ action: "reveal" }, ({ result }) =>
      save({ ...saved, status: "lost", answer: result }),
    );
  }

  return (
    <>
      {celebrate && <Confetti />}
      <div className="mt-1 rounded-2xl bg-sheet p-3 text-lamp">
        <HeatStrip
          hits={hits}
          latest={over ? (won ? FILM : null) : shown ? heatIndex(shown.rank) : null}
          stamp={focus?.n ?? 0}
        />
        {over && saved.answer ? (
          <section aria-labelledby="warmer-result" className="closeups-rise mt-4 flex items-center gap-3.5 pb-0.5">
            <Poster
              src={saved.answer.film.posterUrl}
              className="h-[108px] w-[72px] shadow-[0_8px_18px_-8px_rgb(0_0_0/0.8)]"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-none text-lamp/60">{won ? "Got it" : "It was"}</p>
              <h2
                id="warmer-result"
                ref={resultRef}
                tabIndex={-1}
                className="mt-1.5 font-display text-[34px] font-[900] leading-[0.95] text-balance outline-none"
              >
                {saved.answer.film.title}
              </h2>
              {saved.answer.film.year && (
                <p className="mt-1.5 text-sm font-semibold leading-none text-lamp/60">{saved.answer.film.year}</p>
              )}
            </div>
          </section>
        ) : (
          <div aria-live="polite" className="mt-4 flex min-h-[66px] items-center gap-3">
            {shown ? (
              <Reading key={`${shown.film.id}-${focus?.n ?? 0}`} entry={shown} tag={tagFor(shown, played, focus)} />
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="grid h-[66px] w-[44px] shrink-0 place-items-center rounded-[3px] font-display text-3xl font-[900] text-lamp/40 outline-dashed outline-[1.5px] -outline-offset-[1.5px] outline-lamp/20"
                >
                  ?
                </span>
                <p className="text-lamp/70">
                  One of <strong className="text-lamp">{total.toLocaleString("en-GB")}</strong> films is hidden.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {over ? (
        <div className="mt-3 flex gap-2">
          <ShareButton shareText={() => warmerShareText(date, played, won)} />
          <a
            href={`?date=${addDays(date, -1)}`}
            className="grid h-12 flex-1 place-items-center rounded-xl bg-ink/7 font-condensed text-[17px] font-extrabold tracking-[0.02em] transition-colors hover:bg-ink/12"
          >
            Previous day
          </a>
        </div>
      ) : (
        <div className="mt-3">
          <FilmSearch busy={busy} tried={tried} onPick={guess} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={hint}
              disabled={busy}
              className={`${PILL} bg-ink/7 transition-colors hover:bg-ink/12`}
            >
              <Bulb className="size-4" /> Hint
            </button>
            {(["decade", "genres"] as const).map((kind) => {
              const got = clues.find((c) => c.kind === kind);
              const left = RULES.warmer.clueAfter[kind] - guessCount;
              if (got) {
                return (
                  <span
                    key={kind}
                    className="closeups-tape closeups-chip grid min-h-9 place-items-center bg-[var(--tier-2)] px-3.5 py-1 font-condensed text-[15px] font-extrabold leading-tight text-on-tape"
                  >
                    <span className="sr-only">{CLUE_NAMES[kind]}: </span>
                    {got.value}
                  </span>
                );
              }
              if (left > 0) {
                return (
                  <span
                    key={kind}
                    title={`Opens after ${left} more ${left === 1 ? "guess" : "guesses"}`}
                    className={`${PILL} border-[1.5px] border-dashed border-ink/25 text-ink-soft`}
                  >
                    {CLUE_NAMES[kind]} in {left}
                  </span>
                );
              }
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => clue(kind)}
                  disabled={busy}
                  className={`${PILL} closeups-chip bg-ink text-table transition-colors hover:bg-ink/85`}
                >
                  {CLUE_NAMES[kind]}?
                </button>
              );
            })}
            <GiveUp disabled={busy} onConfirm={giveUp} />
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="mt-2 text-sm font-semibold text-marker">
          {message}
        </p>
      )}

      {played.length > 0 && (
        <section aria-labelledby="warmer-guesses" className="mt-5">
          <h2 id="warmer-guesses" className="text-sm font-semibold leading-none text-ink-soft">
            {tally(guessCount, played.length - guessCount)}
          </h2>
          <ol aria-label="Closest first" className="mt-2.5 flex flex-col gap-1.5">
            {sorted.map((g) => (
              <li key={g.film.id}>
                <Row entry={g} latest={!over && g === shown} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

/** What the reading says above the film: how this guess compares with the ones before it. */
function tagFor(shown: RankedFilm, played: RankedFilm[], focus: { repeat: boolean } | null): string | null {
  if (focus?.repeat) return "Already tried";
  if (shown.hint) return "Hint";
  const earlier = played.slice(0, played.indexOf(shown));
  if (earlier.length === 0) return null;
  if (earlier.every((e) => shown.rank < e.rank)) return "Closest yet";
  return shown.rank < earlier[earlier.length - 1].rank ? "↑ Warmer" : "↓ Colder";
}

/** The control strip: a tape for every step a guess has landed on, an empty slot for the rest. */
function HeatStrip({ hits, latest, stamp }: { hits: Set<number>; latest: number | null; stamp: number }) {
  return (
    <div aria-hidden="true" className="flex gap-1">
      {HEAT.map((step, i) => (
        <span
          // A new key on the latest step replays its animation when two guesses in a row land there.
          key={i === latest ? `${step.key}-${stamp}` : step.key}
          data-latest={i === latest || undefined}
          className={`warmer-slot relative ${i === FILM ? "w-10 shrink-0" : "min-w-0 flex-1"}`}
          style={{ "--heat": step.color } as CSSProperties}
        >
          <span
            data-empty={!hits.has(i) || undefined}
            className="closeups-tape warmer-patch grid h-8 place-items-center font-condensed font-extrabold uppercase leading-none tracking-[0.06em]"
          >
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/** The film just played, with its rank as the biggest thing on the sheet. */
function Reading({ entry, tag }: { entry: RankedFilm; tag: string | null }) {
  const heat = heatOf(entry.rank);
  return (
    <>
      <Poster src={entry.film.posterUrl} className="h-[66px] w-[44px]" />
      <p className="min-w-0 flex-1">
        {tag && (
          <span className="mb-1.5 block font-condensed text-xs font-extrabold uppercase leading-none tracking-[0.08em] text-lamp/60">
            {tag}
          </span>
        )}
        <span className="line-clamp-2 font-semibold leading-tight">{entry.film.title}</span>
        {entry.film.year && <span className="text-sm text-lamp/60">{entry.film.year}</span>}
      </p>
      <Rank rank={entry.rank} className="warmer-rank shrink-0 text-[60px]" style={{ color: heat.color }} />
    </>
  );
}

/** A rank in the display face, with a small `#`; screen readers also hear how warm it is. */
function Rank({ rank, className, style }: { rank: number; className: string; style?: CSSProperties }) {
  return (
    <span className={`font-display font-[900] leading-[0.8] tabular-nums ${className}`} style={style}>
      <span aria-hidden="true" className="mr-[0.05em] inline-block -translate-y-[0.36em] text-[0.56em] opacity-70">
        #
      </span>
      <span className="sr-only">rank </span>
      {rank}
      <span className="sr-only">, {heatOf(rank).label.toLowerCase()}</span>
    </span>
  );
}

/** A played film on its step's tape. Tapping it (or Enter) opens the film's description. */
function Row({ entry, latest }: { entry: RankedFilm; latest: boolean }) {
  const [open, setOpen] = useState(false);
  const heat = heatOf(entry.rank);
  const film = entry.rank === 1;
  return (
    <div
      className={`closeups-chip overflow-hidden rounded-xl bg-surface ${latest ? "ring-2 ring-ink" : "ring-1 ring-ink/10"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-stretch text-left -outline-offset-2"
      >
        <span
          className={`grid w-[4.5rem] shrink-0 place-items-center ${film ? "bg-ink text-table" : "text-on-tape"}`}
          style={film ? undefined : { background: heat.color }}
        >
          <Rank rank={entry.rank} className="text-[28px]" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pl-2.5 pr-3">
          <Poster src={entry.film.posterUrl} className="h-[45px] w-[30px]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-tight">{entry.film.title}</span>
            <span className="text-sm text-ink-soft">
              {[entry.film.year, entry.hint && "hint"].filter(Boolean).join(" · ")}
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`size-4 shrink-0 text-ink-soft/70 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="border-t border-ink/10 px-3 py-2.5 text-sm leading-snug text-ink-soft">
          {entry.film.overview || "No description."}
        </p>
      )}
    </div>
  );
}

/** Giving up ends the game, so it asks once more: the second press within a few seconds does it. */
function GiveUp({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!asking) return;
    const timer = window.setTimeout(() => setAsking(false), 4000);
    return () => window.clearTimeout(timer);
  }, [asking]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (asking ? onConfirm() : setAsking(true))}
      onBlur={() => setAsking(false)}
      className={`ml-auto h-9 rounded-full px-1.5 text-sm font-semibold underline-offset-4 hover:underline ${
        asking ? "text-marker" : "text-ink-soft hover:text-ink"
      }`}
    >
      <span aria-live="polite">{asking ? "Sure?" : "Give up"}</span>
    </button>
  );
}

/** The day being played, and the way to the days either side of it; nothing lies beyond today. */
function DayStepper({ date, today }: { date: string; today: string }) {
  const next = addDays(date, 1);
  const arrow = "grid size-11 place-items-center rounded-full hover:bg-ink/8";
  return (
    <nav aria-label="Other days" className="mt-8 flex items-center justify-center gap-1 text-ink-soft">
      <a href={`?date=${addDays(date, -1)}`} aria-label="Previous day" className={arrow}>
        <Chevron d="M15 5l-7 7 7 7" />
      </a>
      <p className="min-w-44 text-center font-condensed text-[15px] font-bold">
        {date === today ? "Today" : formatPuzzleDate(date)}
      </p>
      {date < today ? (
        <a href={next === today ? SITE.games.warmer : `?date=${next}`} aria-label="Next day" className={arrow}>
          <Chevron d="M9 5l7 7-7 7" />
        </a>
      ) : (
        <span className="size-11" />
      )}
    </nav>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
