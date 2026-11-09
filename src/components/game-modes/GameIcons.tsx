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
  "M 436.3 244.9 C 420.5 252.0, 410.9 279.2, 404.0 336.3 C 402.8 345.6, 401.5 355.1, 401.0 357.3 C 400.5 359.6, 399.4 366.7, 398.5 373.1 C 397.6 379.5, 395.1 390.7, 393.0 397.9 C 385.7 422.1, 382.5 443.9, 379.1 492.5 C 377.6 513.8, 372.4 524.3, 361.4 528.5 C 347.1 534.0, 337.7 524.4, 332.4 499 C 331.0 492.1, 328.8 482.1, 327.4 476.8 C 326.0 471.4, 323.6 461.3, 322.0 454.3 C 320.5 447.2, 316.8 435.2, 314.0 427.6 C 306.7 407.9, 306.5 407.0, 303.0 371.0 C 301.7 358.7, 294.5 322.5, 291.9 315.6 C 281.7 288.5, 251.6 290.5, 243.3 318.8 C 240.0 330.2, 241.9 371.7, 246.9 395.5 C 250.4 412.2, 251.2 418.4, 251.9 433.5 C 252.6 447.5, 253.4 454.4, 255.8 465 C 257.5 472.4, 259.5 482.7, 260.4 488 C 261.3 493.2, 263.8 504.4, 266.0 513 C 277.3 558.1, 277.3 598.9, 266.0 634.5 C 263.9 641.1, 261.0 650.3, 259.6 655.0 C 250.7 684.3, 229.1 672.8, 214.4 631 C 203.7 600.4, 193.7 587.5, 167.7 570.5 C 136.9 550.5, 110.6 547.5, 100.2 562.9 C 95.6 569.7, 97.5 576.9, 107.7 592.1 C 114.6 602.4, 122.2 615.5, 128.1 627.3 C 134.5 640.0, 139.4 647.6, 149.9 660.9 C 166.6 682.2, 169.5 689.1, 171.4 713.5 C 173.4 738.7, 176.4 744.6, 193.9 757.9 C 198.1 761.1, 205.5 768.3, 210.4 773.9 C 224.3 790.0, 240.1 802.9, 258.3 813.1 C 269.3 819.2, 274.4 825.2, 283.6 843.3 C 295.1 865.8, 307.1 877.7, 325.4 884.9 C 329.7 886.7, 337.4 890.3, 342.4 892.9 C 356.2 900.3, 354.1 900.1, 429 899.8 C 514.4 899.4, 505.1 903.0, 523.3 863 C 531.5 844.8, 539.0 822.1, 544.9 797.4 C 547.1 788.6, 550.4 776.0, 552.3 769.4 C 557.3 752.6, 558.6 745.7, 562.0 719.2 C 567.0 679.2, 577.6 634.7, 586.2 617.5 C 590.5 608.8, 605.1 586.2, 614.2 574 C 621.7 563.9, 625.1 557.7, 633.7 538.9 C 635.9 534.2, 642.5 523.1, 648.4 514.2 C 659.4 497.6, 672.2 472.2, 677.6 456.0 C 687.7 426.1, 656.4 407.5, 636.3 431.4 C 632.5 436.0, 618.0 459.1, 605.3 481 C 586.7 513.1, 587.0 512.5, 553.8 557.7 C 541.6 574.3, 534.4 578.5, 527.1 573.3 C 518.4 567.2, 520.7 552.8, 537.7 508.4 C 549.0 478.9, 550.0 475.5, 553.4 452.8 C 556.4 432.2, 558.0 426.0, 567.5 398 C 571.6 385.6, 577.3 367.1, 580.0 357 C 582.7 346.8, 586.1 334.7, 587.4 330.1 C 596.2 300.8, 573.6 279.2, 551.0 295.3 C 543.1 301.0, 540.3 307.0, 532.5 335 C 531.0 340.2, 527.7 350.5, 525.0 358 C 522.4 365.4, 519.2 376, 518.0 381.5 C 512.9 404.2, 506.9 421.3, 499.2 434.2 C 490.0 449.8, 485.4 459.7, 477.0 482.5 C 464.8 515.4, 462.2 520, 455.0 520 C 444.0 520, 443.4 509.4, 451.5 455 C 453.7 439.8, 454.1 433.5, 454.4 408 C 454.7 375.7, 455.5 367.8, 460.5 342.6 C 462.4 333.4, 464.4 320.8, 465.0 314.6 C 465.5 308.5, 466.9 295.8, 468.1 286.5 C 470.7 264.2, 469.9 258.5, 462.8 250.5 C 456.4 243.2, 445.2 240.8, 436.3 244.9";
const HAND_BOX = { x: 87, y: 230, width: 584, height: 675 };

/** One raised open hand, the meme's gesture, thumb on the left; `mirror` puts the thumb on the right. */
export function RaisedHand({ className = "", mirror = false }: { className?: string; mirror?: boolean }) {
  const { x, y, width, height } = HAND_BOX;
  return (
    <svg viewBox={`${x} ${y} ${width} ${height}`} className={className} aria-hidden="true" focusable="false">
      <path d={HAND} fill="currentColor" transform={mirror ? `translate(${2 * x + width} 0) scale(-1 1)` : undefined} />
    </svg>
  );
}
