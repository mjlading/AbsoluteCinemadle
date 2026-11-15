import { chartDescription, type PublicSeason } from "@/lib/ratings-cliff/chart";

/*
 * A series' episode ratings as dots in airing order, seasons side by side in
 * alternating colours over shaded bands, each with its average as a line.
 * The scale fits the data, so a slump from 8.5 to 6 reads as the cliff it is.
 */

const W = 360;
const H = 210;
const LEFT = 26;
const RIGHT = 6;
const TOP = 8;
const BOTTOM = 22;
const COLORS = ["var(--tier-1)", "var(--tier-3)"];

export function RatingsChart({ seasons }: { seasons: PublicSeason[] }) {
  const all = seasons.flatMap((s) => s.ratings);
  const yMin = Math.max(0, Math.floor(Math.min(...all) - 0.2));
  const yMax = Math.min(10, Math.ceil(Math.max(...all) + 0.2));
  // One slot per episode, plus one empty slot between seasons.
  const slots = all.length + seasons.length - 1;
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const step = plotW / slots;
  const x = (slot: number) => LEFT + step * (slot + 0.5);
  const y = (rating: number) => TOP + plotH * (1 - (rating - yMin) / (yMax - yMin));
  const r = Math.max(1.3, Math.min(3.5, step * 0.42));
  const ticks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
  // Label every season unless they would collide; then every other one.
  const labelEvery = plotW / seasons.length < 18 ? 2 : 1;

  let slot = 0;
  const laid = seasons.map((s, i) => {
    const start = slot;
    slot += s.ratings.length + 1;
    const mean = s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length;
    return { season: s, i, start, end: start + s.ratings.length - 1, mean };
  });

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full rounded-xl bg-surface"
        role="img"
        aria-label={chartDescription(seasons)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={LEFT - 5} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--ink-soft)">
              {t}
            </text>
          </g>
        ))}
        {laid.map(({ season, i, start, end, mean }) => (
          <g key={season.number}>
            {i % 2 === 1 && (
              <rect
                x={x(start) - step / 2}
                width={(end - start + 1) * step}
                y={TOP}
                height={plotH}
                fill="currentColor"
                fillOpacity={0.04}
              />
            )}
            <line
              x1={x(start) - step * 0.4}
              x2={x(end) + step * 0.4}
              y1={y(mean)}
              y2={y(mean)}
              stroke="var(--ink-soft)"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
            {season.ratings.map((rating, e) => (
              <circle key={e} cx={x(start + e)} cy={y(rating)} r={r} fill={COLORS[i % 2]}>
                <title>{`S${season.number}: ${rating.toFixed(1)}`}</title>
              </circle>
            ))}
            {i % labelEvery === 0 && (
              <text
                x={(x(start) + x(end)) / 2}
                y={H - 7}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="var(--ink-soft)"
              >
                S{season.number}
              </text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}
