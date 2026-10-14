import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { z } from "zod";

import { FilmControls } from "@/components/admin/FilmControls";
import { FilmSearch } from "@/components/admin/FilmSearch";
import { ScheduleControls } from "@/components/admin/ScheduleControls";
import { TileCard } from "@/components/admin/TileCard";
import { TilePicker } from "@/components/admin/TilePicker";
import { RULES } from "@/config/rules";
import { requireAdmin } from "@/lib/admin/auth";
import { listScheduled } from "@/lib/admin/puzzles";
import { addDays, formatPuzzleDate, utcIsoDate } from "@/lib/dates";
import { checkGrid } from "@/lib/puzzle/grid";
import { loadPuzzle } from "@/lib/puzzle/repository";
import { TIERS, type PuzzleFilm } from "@/lib/puzzle/types";
import type { MovieDetails } from "@/lib/tmdb/api";
import { getMovie } from "@/lib/tmdb/cached";
import { posterUrl } from "@/lib/tmdb/images";
import { RedHerrings } from "./RedHerrings";

const TIER_NAMES = { 1: "easiest", 2: "medium", 3: "hard", 4: "hardest" } as const;
const CAST_SHOWN = 24;

export default function EditorPage({ params }: PageProps<"/admin/puzzles/[id]">) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading the puzzle&hellip;</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/puzzles/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const puzzle = z.uuid().safeParse(id).success ? await loadPuzzle(id) : null;
  if (!puzzle) notFound();

  const details = await Promise.all(
    puzzle.films.map((film) => getMovie(film.tmdbId).catch((): MovieDetails | null => null)),
  );
  const check = checkGrid(puzzle);
  const today = utcIsoDate();
  const live = puzzle.date !== null && puzzle.date <= today;
  const tileBase = `/api/admin/puzzles/${puzzle.id}`;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
          All puzzles
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl font-[900] leading-none">
            {puzzle.date ? `Puzzle for ${formatPuzzleDate(puzzle.date)}` : "Draft puzzle"}
          </h1>
          {check.errors.length === 0 ? (
            <Link
              href={`/admin/preview/${puzzle.id}`}
              className="min-h-11 content-center rounded-full border-[1.5px] border-ink px-5 font-semibold hover:bg-ink/5"
            >
              Preview as a player
            </Link>
          ) : (
            <span className="text-sm text-ink-soft">Preview unlocks once the grid is complete.</span>
          )}
        </div>
        {live && (
          <p role="status" className="mt-3 rounded-lg bg-marker/10 px-4 py-3">
            <strong className="font-semibold">This puzzle is live.</strong> Changes reach players straight away.
          </p>
        )}
      </div>

      <Section title="Films" note="One film per difficulty tier. Tile colors on reveal follow the tier.">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const film = puzzle.films.find((f) => f.tier === tier);
            return (
              <li key={tier} className="overflow-hidden rounded-lg border border-ink/10 bg-surface">
                <div
                  className="px-3 py-1.5 text-sm font-semibold text-on-tape"
                  style={{ background: `var(--tier-${tier})` }}
                >
                  Tier {tier} <span className="font-normal">({TIER_NAMES[tier]})</span>
                </div>
                <div className="p-3">
                  {film ? (
                    <FilmSummary
                      puzzleId={puzzle.id}
                      film={film}
                      tileCount={puzzle.tiles.filter((t) => t.filmId === film.tmdbId).length}
                    />
                  ) : (
                    <FilmSearch puzzleId={puzzle.id} tier={tier} />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {puzzle.films.map((film, index) => {
        const movie = details[index];
        const filmTiles = puzzle.tiles.filter((t) => t.filmId === film.tmdbId);
        const full = filmTiles.length >= RULES.grid.groupSize;
        return (
          <Section
            key={film.tmdbId}
            title={`Tiles for ${film.title}`}
            note={`${filmTiles.length} of ${RULES.grid.groupSize}. Mix the types differently in each film, so players can't solve by elimination.`}
            accent={`var(--tier-${film.tier})`}
          >
            <ul className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {filmTiles.map((tile) => (
                <TileCard
                  key={`${tile.id}:${tile.label}`}
                  puzzleId={puzzle.id}
                  tile={{
                    id: tile.id,
                    type: tile.type,
                    label: tile.label,
                    imageUrl: `${tileBase}/tiles/${tile.id}/image`,
                  }}
                />
              ))}
              {Array.from({ length: Math.max(0, RULES.grid.groupSize - filmTiles.length) }, (_, i) => (
                <li
                  key={`empty-${i}`}
                  className="grid aspect-square place-items-center rounded-[3px] border-2 border-dashed border-ink/20 text-sm text-ink-soft"
                >
                  Empty
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {full ? (
                <p className="text-ink-soft">
                  All {RULES.grid.groupSize} tiles are placed. Remove one to try another picture.
                </p>
              ) : movie ? (
                <TilePicker
                  puzzleId={puzzle.id}
                  filmId={film.tmdbId}
                  cast={movie.cast.filter((c) => c.profilePath).slice(0, CAST_SHOWN)}
                  backdrops={movie.backdrops}
                />
              ) : (
                <p role="alert" className="text-marker">
                  TMDB is not answering, so pictures for this film can&apos;t be listed. Reload to try again.
                </p>
              )}
            </div>
          </Section>
        );
      })}

      <Section title="Red herrings" note="Links between the films, for tiles that point the wrong way on purpose.">
        <Suspense fallback={<p className="text-ink-soft">Looking up filmographies&hellip;</p>}>
          <RedHerrings films={details.filter((d): d is MovieDetails => d !== null)} />
        </Suspense>
      </Section>

      <Section title="Check and schedule">
        <GridCheck errors={check.errors} warnings={check.warnings} />
        <div className="mt-6">
          <Suspense fallback={null}>
            <Schedule puzzleId={puzzle.id} date={puzzle.date} today={today} blocked={check.errors.length > 0} />
          </Suspense>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  note,
  accent,
  children,
}: {
  title: string;
  note?: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-xl border border-ink/10 bg-surface p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        {accent && <span aria-hidden="true" className="h-4 w-6 rounded-[2px]" style={{ background: accent }} />}
        {title}
      </h2>
      {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FilmSummary({ puzzleId, film, tileCount }: { puzzleId: string; film: PuzzleFilm; tileCount: number }) {
  const poster = posterUrl(film.posterPath);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <span className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[2px] bg-ink/10">
          {poster && <Image src={poster} alt="" fill unoptimized sizes="4rem" className="object-cover" />}
        </span>
        <div>
          <p className="font-semibold leading-tight">{film.title}</p>
          <p className="text-sm text-ink-soft">{film.year ?? "Year unknown"}</p>
          <p className="mt-1 text-sm">
            {tileCount} of {RULES.grid.groupSize} tiles
          </p>
        </div>
      </div>
      <FilmControls puzzleId={puzzleId} filmId={film.tmdbId} title={film.title} tier={film.tier} />
    </div>
  );
}

function GridCheck({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return <p className="font-semibold">The grid is complete and ready to schedule.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {errors.map((error) => (
        <li key={error} className="flex gap-2">
          <span className="font-semibold text-marker">Fix:</span> {error}
        </li>
      ))}
      {warnings.map((warning) => (
        <li key={warning} className="flex gap-2">
          <span className="font-semibold">Consider:</span> {warning}
        </li>
      ))}
    </ul>
  );
}

/** Offers the first free day in the next two weeks as the default date. */
async function Schedule({
  puzzleId,
  date,
  today,
  blocked,
}: {
  puzzleId: string;
  date: string | null;
  today: string;
  blocked: boolean;
}) {
  const horizon = 14;
  const scheduled = await listScheduled(today, addDays(today, horizon));
  const taken = new Set(scheduled.map((p) => p.date));
  const suggested =
    Array.from({ length: horizon }, (_, i) => addDays(today, i)).find((d) => !taken.has(d)) ?? addDays(today, horizon);
  return <ScheduleControls puzzleId={puzzleId} date={date} suggestedDate={suggested} blocked={blocked} />;
}
