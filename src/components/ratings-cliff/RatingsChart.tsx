import { RULES } from "@/config/rules";
import { chartClue, chartDescription, ratingBand, seasonColumn, type PublicSeason } from "@/lib/ratings-cliff/chart";

/*
 * A series' episode ratings as a grid on the dark contact sheet: one column per
 * season, one row per episode, each cell showing its rating on a colour for how
 * good it is. A season that sank reads as a column turning from cool to red.
 */

const FLOORS = RULES.ratingsCliff.chartBands;

/**
 * One fill per band, best first: the site's cyan tape at the top and its red china marker at the
 * bottom. The rating is printed in every cell, so colour is never the only cue; the text is dark on
 * every fill but the red, each pair at 4.5:1 or better.
 */
export const BANDS = [
  { fill: "#4cc3d9", text: "#181b21" },
  { fill: "#3fb57a", text: "#181b21" },
  { fill: "#a6d86e", text: "#181b21" },
  { fill: "#f2c641", text: "#181b21" },
  { fill: "#ee8a3a", text: "#181b21" },
  { fill: "#d92b3f", text: "#ffffff" },
];

/** "9+" for a band with a floor, "<6" for the worst. */
const bandLabel = (band: number) => (band < FLOORS.length ? `${FLOORS[band]}+` : `<${FLOORS[FLOORS.length - 1]}`);

/** Columns grow to this width (in rem) and no further, so a two-season chart isn't stretched across the page. */
const MAX_COLUMN_REM = 3.25;

export function RatingsChart({ seasons }: { seasons: PublicSeason[] }) {
  const columns = seasons.map(seasonColumn);
  const rows = Math.max(...columns.map((c) => c.length));
  // With many seasons the cells get narrow, so the numbers shrink to fit.
  const dense = seasons.length > 7;

  return (
    <figure className="m-0 rounded-2xl bg-sheet p-2.5 text-lamp shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_18px_40px_-18px_rgb(0_0_0/0.6)] sm:p-3">
      <div className="flex justify-center">
        <table
          className="w-full table-fixed border-separate border-spacing-[3px] tabular-nums"
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
                  className={`pb-1 font-condensed font-extrabold uppercase tracking-[0.04em] text-lamp/70 ${dense ? "text-[10px]" : "text-xs"}`}
                >
                  S{s.number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                <th
                  scope="row"
                  className="pr-1 text-right font-condensed text-[11px] font-bold leading-none text-lamp/50"
                >
                  E{row + 1}
                </th>
                {columns.map((column, i) => {
                  const rating = column[row] ?? null;
                  if (rating === null) return <td key={seasons[i].number} />;
                  const band = BANDS[ratingBand(rating, FLOORS)];
                  return (
                    <td
                      key={seasons[i].number}
                      className={`h-6 rounded-[4px] text-center font-bold leading-none ${dense ? "text-[10.5px]" : "text-[13px]"}`}
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
      </div>
      <figcaption className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <span className="font-condensed text-[13px] font-bold text-lamp/70">{chartClue(seasons)}</span>
        <span className="flex gap-1" aria-hidden="true">
          {BANDS.map((band, i) => (
            <span
              key={band.fill}
              className="rounded-[3px] px-1.5 py-0.5 font-condensed text-[11px] font-extrabold leading-none"
              style={{ background: band.fill, color: band.text }}
            >
              {bandLabel(i)}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
