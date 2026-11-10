import type { CSSProperties } from "react";

/*
 * The talking character on sound-effect nodes: a clapperboard that speaks
 * with two pieces. The striped clapstick is the upper jaw and carries the
 * eyes, the slate is the lower jaw, and opening the hinge shows a mouth. Each
 * node gets one of three personalities (stripes, eyes, brows).
 *
 * soundbytes.css ("cb-") snaps the jaw open from --sb-open and --sb-side, which
 * the clip player writes while its clip plays (see use-clip-player.ts).
 */

const HINGE = { x: 13, y: 39 };

const PERSONALITIES = [
  { stripes: ["#f4f2ea", "#181b21"], eyes: "round" },
  { stripes: ["#4cc3d9", "#f2c641", "#e2579b", "#f4f2ea"], eyes: "sleepy" },
  { stripes: ["#f2c641", "#181b21"], eyes: "startled" },
] as const;

/** Which personality each board slot gets, so neighbouring characters differ. */
const BY_SLOT = [0, 1, 2, 1, 2, 0];

export function ClapperHead({ slot, uid }: { slot: number; uid: string }) {
  const index = BY_SLOT[slot] ?? 0;
  const p = PERSONALITIES[index];
  const id = `sb-clapper-${uid}`;
  return (
    <svg className="sb-figure-art sb-clapper" viewBox="0 0 100 112" aria-hidden="true" data-eyes={p.eyes}>
      <defs>
        {/* The mouth only shows above the slate, between its edges. */}
        <clipPath id={`${id}-mouth`}>
          <rect x="11" y="-40" width="78" height="79.5" />
        </clipPath>
      </defs>

      <g className="cb-feet">
        <ellipse cx="34" cy="106" rx="9" ry="4.2" fill="#181b21" />
        <ellipse cx="66" cy="106" rx="9" ry="4.2" fill="#181b21" />
      </g>

      <g className="cb-character">
        {/* Inside of the mouth: hangs under the clapstick, hidden by the slate until the jaw opens. */}
        <g clipPath={`url(#${id}-mouth)`}>
          <g className="cb-jaw">
            {/* Its far edge slants back toward the hinge, so the open mouth ends near the slate's corner, not past the stick. */}
            <path d={`M${HINGE.x} ${HINGE.y}H89L74 87H${HINGE.x}z`} fill="#3b1020" />
          </g>
          <ellipse className="cb-tongue" cx="55" cy="40.5" rx="15" ry="5" fill="#ef6a86" />
        </g>

        {/* Lower piece: the slate, with chalk rows and no writing. */}
        <rect x="11" y="39" width="78" height="62" rx="5" fill="#1d2026" stroke="#0b0c0f" strokeWidth="2" />
        <path
          d="M15 59.5h70M15 79.5h70M50 59.5v38"
          stroke="#f4f2ea"
          strokeOpacity="0.28"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M18 47h22" stroke="#f4f2ea" strokeOpacity="0.16" strokeWidth="5" strokeLinecap="round" />

        {/* Upper piece: the clapstick, which talks, and the eyes that ride on it. */}
        <g className="cb-jaw">
          <Stripes colours={p.stripes} />
          <Eyes kind={p.eyes} />
        </g>
        <circle cx={HINGE.x + 1.5} cy={HINGE.y - 1.5} r="2.6" fill="#9aa3b1" stroke="#0b0c0f" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/** The clapstick: a bar in the last colour, with slanted stripes cycling through the others. */
function Stripes({ colours }: { colours: readonly string[] }) {
  const stripes = Array.from({ length: 8 }, (_, i) => i);
  return (
    <g>
      <rect x="11" y="30" width="78" height="9" rx="1.5" fill={colours[colours.length - 1]} />
      {stripes.map((i) => (
        <path key={i} d={`M${14 + i * 9} 39l5-9h4.5l-5 9z`} fill={colours[i % (colours.length - 1)]} />
      ))}
      <rect x="11" y="30" width="78" height="9" rx="1.5" fill="none" stroke="#0b0c0f" strokeWidth="2" />
    </g>
  );
}

function Eyes({ kind }: { kind: "round" | "sleepy" | "startled" }) {
  const pupil = kind === "startled" ? 2.4 : 4.6;
  return (
    <g>
      <g className="cb-eye cb-eye-l" style={{ "--eye-x": "37px", "--eye-y": "20px" } as CSSProperties}>
        <g className="cb-blink">
          <circle cx="37" cy="20" r="11" fill="#fff" stroke="#0b0c0f" strokeWidth="2.2" />
          <circle className="cb-pupil" cx="39" cy="21.5" r={pupil} fill="#181b21" />
          {kind === "sleepy" && <path d="M25.6 18.5a11.4 11.4 0 0 1 22.8 0z" fill="#1d2026" />}
        </g>
      </g>
      <g className="cb-eye cb-eye-r" style={{ "--eye-x": "63px", "--eye-y": "19px" } as CSSProperties}>
        <g className="cb-blink">
          <circle cx="63" cy="19" r={kind === "startled" ? 12 : 9.5} fill="#fff" stroke="#0b0c0f" strokeWidth="2.2" />
          <circle className="cb-pupil" cx="61.5" cy="20.5" r={pupil * 0.86} fill="#181b21" />
          {kind === "sleepy" && <path d="M53.1 17.8a9.9 9.9 0 0 1 19.8 0z" fill="#1d2026" />}
        </g>
      </g>
      <g className="cb-brow cb-brow-l">
        <path
          d={kind === "startled" ? "M27 4c4-3 10-3 15-1" : "M27 8c4-2 10-2.5 15 0"}
          fill="none"
          stroke="#181b21"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </g>
      <g className="cb-brow cb-brow-r">
        <path
          d={
            kind === "sleepy"
              ? "M55 3c4-2.5 10-2 14 1.5"
              : kind === "startled"
                ? "M55 3c4-2 9-2 14 1"
                : "M55 7.5c4-1.5 9-1.5 13 1"
          }
          fill="none"
          stroke="#181b21"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
