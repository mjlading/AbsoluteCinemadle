import { RULES } from "@/config/rules";
import { chartDescription, ratingBand, seasonColumn, type PublicSeason } from "@/lib/ratings-cliff/chart";

/*
 * A series' episode ratings as a grid: one column per season, one row per
 * episode, each cell showing its rating and coloured by how good it is. A
 * season that sank reads as a column turning from green to red.
 */

const FLOORS = RULES.ratingsCliff.chartBands;

/**
 * One fill per band, best first. The rating is printed in every cell, so the colour
 * is never the only cue; the text colour is the one with the better contrast on each fill.
 */
const BANDS = [
  { fill: "#2b7de0", text: "#0b0b0b" },
  { fill: "#1e8f4e", text: "#0b0b0b" },
  { fill: "#52c97c", text: "#0b0b0b" },
  { fill: "#f5cf4a", text: "#0b0b0b" },
  { fill: "#ee7a2a", text: "#0b0b0b" },
  { fill: "#d92b3f", text: "#ffffff" },
];

/** "9+" for a band with a floor, "under 6" for the worst. */
const bandLabel = (band: number) => (band < FLOORS.length ? `${FLOORS[band]}+` : `under ${FLOORS[FLOORS.length - 1]}`);

/** Columns grow to this width (in rem) and no further, so a two-season chart isn't stretched across the page. */
const MAX_COLUMN_REM = 3.5;

export function RatingsChart({ seasons }: { seasons: PublicSeason[] }) {
  const columns = seasons.map(seasonColumn);
  const rows = Math.max(...columns.map((c) => c.length));
  // With many seasons the cells get narrow, so the numbers shrink to fit.
  const dense = seasons.length > 8;

  return (
    <figure className="m-0 rounded-xl bg-surface p-2 sm:p-3">
      <table
        className="w-full table-fixed border-separate border-spacing-[2px] tabular-nums"
        style={{ maxWidth: `${1.75 + seasons.length * MAX_COLUMN_REM}rem` }}
      >
        <caption className="sr-only">{chartDescription(seasons)}</caption>
        <thead>
          <tr>
            <td className="w-7" />
            {seasons.map((s) => (
              <th
                key={s.number}
                scope="col"
                className={`pb-0.5 font-semibold text-ink-soft ${dense ? "text-[11px]" : "text-xs"}`}
              >
                S{s.number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              <th scope="row" className="pr-1 text-right text-[11px] font-normal text-ink-soft">
                E{row + 1}
              </th>
              {columns.map((column, i) => {
                const rating = column[row] ?? null;
                if (rating === null) return <td key={seasons[i].number} />;
                const band = BANDS[ratingBand(rating, FLOORS)];
                return (
                  <td
                    key={seasons[i].number}
                    className={`h-6 rounded-[4px] text-center font-bold leading-none ${dense ? "text-[11px]" : "text-[13px]"}`}
                    style={{ background: band.fill, color: band.text }}
                  >
                    {rating.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
        {BANDS.map((band, i) => (
          <span key={band.fill} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: band.fill }} />
            {bandLabel(i)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
