"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { CastMember, ImageInfo } from "@/lib/tmdb/api";
import { tmdbImageUrl } from "@/lib/tmdb/images";
import { CropDialog, type CropTarget } from "./CropDialog";

type Tab = "cast" | "stills";

const STILLS_SHOWN = 36;

/** Browses a film's cast photos and backdrops, and opens the crop tool for the chosen picture. */
export function TilePicker({
  puzzleId,
  filmId,
  cast,
  backdrops,
}: {
  puzzleId: string;
  filmId: number;
  cast: CastMember[];
  backdrops: ImageInfo[];
}) {
  const [tab, setTab] = useState<Tab>("cast");
  const [person, setPerson] = useState<CastMember | null>(null);
  const [target, setTarget] = useState<CropTarget | null>(null);
  const [showAllStills, setShowAllStills] = useState(false);
  const stills = showAllStills ? backdrops : backdrops.slice(0, STILLS_SHOWN);

  return (
    <div>
      <div role="tablist" aria-label="Picture source" className="flex gap-1 border-b border-ink/10">
        {(["cast", "stills"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-10 border-b-2 px-3 font-semibold ${tab === t ? "border-ink" : "border-transparent text-ink-soft"}`}
          >
            {t === "cast" ? `Cast (${cast.length})` : `Stills (${backdrops.length})`}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pt-3">
        {tab === "cast" ? (
          person ? (
            <PersonPhotos key={person.personId} person={person} onBack={() => setPerson(null)} onPick={setTarget} />
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
              {cast.map((member) => (
                <li key={member.personId}>
                  <button
                    type="button"
                    onClick={() => setPerson(member)}
                    className="flex w-full flex-col gap-1 text-left hover:opacity-85"
                  >
                    <span className="relative aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-ink/10">
                      {member.profilePath && (
                        <Image
                          src={tmdbImageUrl(member.profilePath, "w185")}
                          alt=""
                          fill
                          unoptimized
                          sizes="7rem"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="text-sm font-semibold leading-tight">{member.name}</span>
                    <span className="line-clamp-2 text-xs leading-tight text-ink-soft">{member.character}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : backdrops.length === 0 ? (
          <p className="text-ink-soft">TMDB has no stills for this film.</p>
        ) : (
          <>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
              {stills.map((image) => (
                <li key={image.path}>
                  <button
                    type="button"
                    aria-label={`Use still ${image.path}`}
                    onClick={() => setTarget({ source: "backdrop", image })}
                    className="relative block aspect-video w-full overflow-hidden rounded-[3px] bg-ink/10 hover:opacity-85"
                  >
                    <Image
                      src={tmdbImageUrl(image.path, "w300")}
                      alt=""
                      fill
                      unoptimized
                      sizes="12rem"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
            {stills.length < backdrops.length && (
              <button
                type="button"
                onClick={() => setShowAllStills(true)}
                className="mt-4 min-h-10 rounded-full border-[1.5px] border-ink px-5 font-semibold"
              >
                Show all {backdrops.length} stills
              </button>
            )}
          </>
        )}
      </div>

      {target && (
        <CropDialog
          key={target.image.path}
          puzzleId={puzzleId}
          filmId={filmId}
          target={target}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

/** All of TMDB's photos of one person, so the headshot can match the film's era. */
function PersonPhotos({
  person,
  onBack,
  onPick,
}: {
  person: CastMember;
  onBack: () => void;
  onPick: (target: CropTarget) => void;
}) {
  const [photos, setPhotos] = useState<ImageInfo[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProfiles(person.personId).then(
      (profiles) => !cancelled && setPhotos(profiles),
      (reason: Error) => !cancelled && setFailed(reason.message),
    );
    return () => {
      cancelled = true;
    };
  }, [person.personId]);

  return (
    <div>
      <button type="button" onClick={onBack} className="text-sm underline underline-offset-2">
        Back to cast
      </button>
      <h4 className="mt-2 font-semibold">
        Photos of {person.name}{" "}
        <span className="font-normal text-ink-soft">{person.character && `as ${person.character}`}</span>
      </h4>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-marker">
          {failed}
        </p>
      )}
      {!photos && !failed && <p className="mt-2 text-sm text-ink-soft">Loading photos&hellip;</p>}
      {photos && (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
          {photos.map((image) => (
            <li key={image.path}>
              <button
                type="button"
                aria-label={`Use photo ${image.path}`}
                onClick={() => onPick({ source: "profile", image, personName: person.name })}
                className="relative block aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-ink/10 hover:opacity-85"
              >
                <Image
                  src={tmdbImageUrl(image.path, "w185")}
                  alt=""
                  fill
                  unoptimized
                  sizes="7rem"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function fetchProfiles(personId: number): Promise<ImageInfo[]> {
  const response = await fetch(`/api/admin/tmdb/people/${personId}/profiles`);
  const body = (await response.json()) as { profiles?: ImageInfo[]; error?: string };
  if (!response.ok) throw new Error(body.error ?? "Could not load photos.");
  return body.profiles ?? [];
}
