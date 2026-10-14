import Image from "next/image";

import { RULES } from "@/config/rules";
import type { PublicTile, SolvedGroup } from "@/lib/puzzle/types";

interface GroupBannerProps {
  group: SolvedGroup;
  tilesById: ReadonlyMap<string, PublicTile>;
  /** Shown after the round was lost rather than found by the player. */
  revealed: boolean;
}

/** A strip of colored tape over a solved row: poster, film title, year and the four frames. */
export function GroupBanner({ group, tilesById, revealed }: GroupBannerProps) {
  return (
    <li
      className="group-banner flex h-(--tile) list-none items-center gap-3 rounded-[3px] p-[7px] text-on-tape"
      style={{ background: `var(--tier-${group.tier})` }}
    >
      <div className="relative aspect-[2/3] h-full shrink-0 overflow-hidden rounded-[2px] bg-sheet shadow-[0_1px_2px_rgb(0_0_0/0.35)]">
        {group.posterUrl && (
          <Image src={group.posterUrl} alt="" fill unoptimized sizes="4rem" className="object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-display text-[1.6rem] font-[850] leading-[0.92] text-balance">
          <span className="sr-only">{revealed ? "Revealed: " : "Solved: "}</span>
          {group.title}
        </h3>
        <p className="mt-1 text-sm font-semibold leading-none">
          {group.year}
          {revealed && <span className="font-normal">{group.year ? ", " : ""}revealed</span>}
          <span className="sr-only">
            , difficulty {group.tier} of {RULES.grid.groupCount}
          </span>
        </p>
      </div>
      <div className="grid aspect-square h-full shrink-0 grid-cols-2 gap-0.5">
        {group.tileIds.map((id) => {
          const tile = tilesById.get(id);
          return (
            <div key={id} className="relative overflow-hidden rounded-[2px] bg-sheet">
              {tile && <Image src={tile.imageUrl} alt="" fill unoptimized sizes="2.5rem" className="object-cover" />}
            </div>
          );
        })}
      </div>
    </li>
  );
}
