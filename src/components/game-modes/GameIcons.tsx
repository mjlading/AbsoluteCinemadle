/*
 * The home page's game icons, drawn as one set: bold ink outlines, white
 * fills and one red accent, on the card's own color.
 */

const INK = "#181b21";
const PAPER = "#fbfaf6";
const RED = "#d92b3f";
const line = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** Four close-ups in a 2x2 sheet, and the Enhance magnifier over them. */
export function CloseUpsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(-6 44 44)">
        <rect x="10" y="10" width="68" height="68" rx="9" fill={INK} />
        {[
          [15, 15],
          [46, 15],
          [15, 46],
          [46, 46],
        ].map(([x, y]) => (
          <rect key={`${x}${y}`} x={x} y={y} width="27" height="27" rx="4" fill={PAPER} />
        ))}
      </g>
      <circle cx="66" cy="66" r="15" fill={PAPER} {...line} />
      <path d="M77 77l11 11" {...line} strokeWidth={6} />
      <path d="M60 66h12M66 60v12" stroke={RED} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Two headshots on a sheet, the front one crossed off in red marker. */
export function CastingCallIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(8 62 44)">
        <rect x="42" y="12" width="40" height="50" rx="6" fill={PAPER} {...line} />
        <circle cx="62" cy="30" r="8" fill="none" {...line} />
        <path d="M49 58c2-9 7-12 13-12s11 3 13 12" fill="none" {...line} />
      </g>
      <g transform="rotate(-6 36 56)">
        <rect x="14" y="30" width="44" height="54" rx="6" fill={PAPER} {...line} />
        <circle cx="36" cy="50" r="9" fill="none" {...line} />
        <path d="M21 80c2-10 8-14 15-14s13 4 15 14" fill="none" {...line} />
      </g>
      <path
        d="M12 34c14 14 30 30 48 46M58 32C44 48 30 62 14 80"
        stroke={RED}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** A speaker sending out sound, one wave in red. */
export function SoundbytesIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <path d="M14 38h14l20-16v52L28 58H14Z" fill={PAPER} {...line} />
      <path d="M58 38c5 6 5 14 0 20" fill="none" stroke={RED} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M67 29c10 11 10 27 0 38" fill="none" {...line} strokeWidth={4.5} />
      <path d="M76 20c15 16 15 40 0 56" fill="none" {...line} strokeWidth={4.5} />
    </svg>
  );
}

/** One raised open hand, palm out, thumb on the left: traced from a photo of the owner's own hand. */
const HAND =
  "M 420.1 233.0 C 406.0 239.4, 400.4 249.4, 395.4 277.6 C 390.3 306.7, 389.1 314.6, 388.0 329.5 C 386.4 351.0, 384.5 364.8, 379.9 387.5 C 375.1 411.8, 374.2 422.1, 373.0 469.5 C 372.0 510.7, 371.7 512.8, 365.2 519.5 C 356.3 528.7, 345.3 527.7, 339.6 517.1 C 336.1 510.4, 326.1 474.6, 321.0 450 C 317.9 434.6, 316.4 429.7, 310.6 415.7 C 305.7 404.0, 303.2 393.1, 301.9 377 C 300.7 362.4, 292.1 315.6, 288.9 306.4 C 279.2 278.1, 246.4 280.2, 237.2 309.8 C 233.6 321.5, 234.7 363.6, 239.2 385.7 C 241.3 395.9, 243.6 411.2, 244.5 420.7 C 246.3 440.4, 248.0 450.6, 252.0 465 C 257.8 485.8, 267.3 529.3, 269.0 542.6 C 274.0 583.0, 261.2 655.7, 247.7 664.0 C 236.1 671.0, 222.2 655.7, 210.9 623.5 C 200.4 593.4, 190.4 581.1, 161.1 562.7 C 129.7 542.9, 99.7 541.4, 91.0 559.3 C 87.2 567.2, 88.2 569.8, 103.7 591.5 C 106.9 595.9, 113.2 607.0, 117.8 616.0 C 122.5 625.1, 130.5 640.1, 135.8 649.5 C 152.5 679.1, 158.1 693.4, 163.5 721 C 170.1 754.2, 174.9 762.8, 214 810.5 C 219.8 817.6, 231.3 832.7, 239.4 844 C 247.6 855.2, 256.9 867.9, 260.2 872.2 C 263.4 876.5, 268.7 884.0, 272.0 888.9 C 278.1 898.1, 282.1 901.9, 287.8 903.8 C 292.9 905.5, 493.6 905.4, 499.3 903.7 C 505.4 901.9, 510.2 896.5, 513.4 887.8 C 515.0 883.8, 519.7 872.8, 524.0 863.5 C 543.4 820.9, 557.9 764.3, 563.5 709.5 C 565.7 687.9, 568.9 669.6, 574.9 644.1 C 581.6 615.7, 581.3 616.3, 613.3 564 C 617.2 557.6, 624.0 544.4, 628.5 534.5 C 633.0 524.6, 640.3 510.1, 644.8 502.3 C 654.0 486.2, 655.4 483.0, 663.9 459.5 C 674.8 429.7, 672.7 414.9, 656.5 407.3 C 642.0 400.6, 628.8 408.3, 616.0 431.2 C 612.5 437.4, 607.0 447, 603.7 452.5 C 600.5 458, 594.3 469.7, 590.0 478.5 C 585.7 487.3, 578.4 500.3, 573.9 507.5 C 569.3 514.6, 560.8 528.9, 554.8 539.3 C 537.1 570.3, 531.0 575.5, 520.1 568.9 C 509.9 562.7, 511.3 548.1, 526.8 500 C 534.7 475.5, 535.7 471.5, 536.9 458 C 539.7 429.4, 540.2 424.8, 542.1 415 C 543.2 409.2, 545.8 397.9, 547.9 390 C 552.8 371.3, 552.4 373.3, 555.9 351.3 C 557.6 341.0, 559.9 328.4, 560.9 323.5 C 565.8 301.4, 561.0 287.8, 546 281.0 C 527.6 272.7, 510.8 286.4, 505.7 313.8 C 504.6 319.7, 501.1 335.3, 497.9 348.5 C 494.7 361.7, 490.9 379.0, 489.5 387 C 488.2 394.9, 485.2 407.5, 483.1 415 C 480.9 422.4, 477.7 433.9, 476.1 440.5 C 474.4 447.1, 470.6 461.2, 467.6 472 C 464.7 482.7, 461.2 495.7, 459.9 501 C 456.3 515.8, 448.9 521.4, 442.6 513.9 C 439.0 509.7, 438.6 504.6, 440.3 487 C 441.2 478.4, 442.4 466.3, 442.9 460 C 443.5 453.6, 444.8 443.5, 445.7 437.5 C 447.0 429.1, 447.3 422.2, 447.0 408.5 C 446.2 372.4, 446.5 364.6, 449.8 341.8 C 451.7 328.5, 453 316.1, 453 309.8 C 453 304.1, 453.7 291.1, 454.5 280.9 C 458.0 240.3, 444.7 221.8, 420.1 233.0";
const HAND_BOX = { x: 89, y: 230, width: 582, height: 675 };

/** One raised open hand, the meme's gesture, thumb on the left; `mirror` puts the thumb on the right. */
export function RaisedHand({ className = "", mirror = false }: { className?: string; mirror?: boolean }) {
  const { x, y, width, height } = HAND_BOX;
  return (
    <svg viewBox={`${x} ${y} ${width} ${height}`} className={className} aria-hidden="true" focusable="false">
      <path d={HAND} fill="currentColor" transform={mirror ? `translate(${2 * x + width} 0) scale(-1 1)` : undefined} />
    </svg>
  );
}
