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

/*
 * The owner's own two hands, each traced from a photo, palm out: the left hand
 * has its thumb on the right, the right hand on the left, so both point in at the title.
 * Each photo was turned so its wrist stands straight up, as in the meme, and the wrist
 * ends flat. `size` evens out the two photos' scales, so both wrists come out as wide.
 */
const HANDS = {
  left: {
    d: "M 247.3 157.9 C 235.1 163.4, 232.2 189.9, 237.9 241.5 C 239.2 252.3, 239.1 275.4, 237.9 292.8 C 237.0 305.0, 237.2 310.6, 239.0 331.3 C 243.2 379.6, 243.2 381.6, 238.5 385.7 C 230.9 392.2, 226.6 386.6, 220.6 362.3 C 217.9 351.6, 213.9 338.8, 211.4 332.7 C 209.0 326.8, 204.9 317.0, 202.3 310.9 C 199.0 302.8, 195.2 289.7, 188.5 262.6 C 175.9 212.3, 172.9 206.9, 156.9 207.0 C 133.6 207.0, 132.2 226.4, 149.9 298.5 C 153.7 313.9, 158.0 333.2, 159.4 341.4 C 161.5 353.2, 164.1 362.8, 172.0 386.5 C 184.7 425.2, 184.9 430.8, 173.7 436.3 C 161.5 442.3, 133.6 406.1, 103.9 345.5 C 88.1 313.4, 82.4 307, 69.9 307 C 59.0 307, 51 315.9, 51 327.8 C 51 345.1, 79.3 410.1, 98.2 436.1 C 126.3 474.9, 126.4 475.0, 139.4 527.5 C 156.2 595.2, 165.6 623.4, 181.8 655 C 212.7 715.0, 210.4 706.0, 210.7 767.2 L 211.0 818 295.0 818 L 379 818 379 768.2 C 379 727.9, 378.6 716.2, 377.3 706.9 C 374.5 686.5, 375.9 681.0, 387.6 667.3 C 391.2 663.0, 398.2 654.2, 403.0 647.9 C 407.9 641.5, 416.7 630.9, 422.7 624.4 C 446.5 598.2, 459.7 582.7, 471.9 566.5 C 486.7 546.8, 496.6 536.8, 510 528.5 C 515.2 525.2, 525.3 518.7, 532.5 513.9 C 539.6 509.2, 548.6 503.6, 552.5 501.4 C 574.4 489.3, 575.0 476.8, 554 467.0 C 527.8 454.9, 497.0 461.8, 466.0 486.9 C 431.7 514.5, 406.2 516.9, 392.6 493.6 C 375.5 464.5, 370.8 422.4, 380.3 384.4 C 386.2 360.8, 391.7 330.4, 393.9 309.5 C 395.0 298.5, 396.6 284.1, 397.5 277.5 C 403.2 236.0, 394.1 204.4, 376.2 203.2 C 359.3 202.1, 352.7 218.2, 350.0 267.2 C 348.9 286.1, 348.0 290.5, 342.1 305.8 C 337.7 316.9, 337.0 319.6, 330.8 349 C 323.7 382.8, 320.6 389, 310.6 389 C 298.6 389, 297 383.4, 296.9 342.5 C 296.9 308.9, 296.3 299.0, 292.4 274.5 C 291.0 265.7, 289.0 249.5, 287.9 238.5 C 281.2 171.2, 269.4 147.8, 247.3 157.9",
    box: { x: 51, y: 156, width: 518, height: 662 },
    size: 1.139,
  },
  right: {
    d: "M 417.2 284.5 C 398.2 294.0, 396.6 318.7, 411.0 379.1 C 416.1 400.6, 417.5 409.6, 419.4 430.7 C 421.4 453.3, 422.3 457.2, 433.9 497.5 C 450.9 556.0, 451.4 559.6, 442.6 567.8 C 431.8 577.9, 426.9 572.8, 404.4 527.8 C 395.2 509.5, 384.2 488.5, 379.8 481.2 C 370.5 465.7, 367.5 459.4, 362.1 443.8 C 351.6 413.4, 335.6 379.6, 328.1 371.6 C 315.5 358.4, 296.6 361.8, 288.3 378.7 C 281.4 392.8, 287.1 424.4, 302.7 458.5 C 310.0 474.4, 313.8 484.7, 318.9 501.5 C 324.2 519.1, 326.9 524.7, 346.9 561 C 379.4 619.6, 385.4 639.4, 385.4 690 C 385.5 719.6, 385.2 720.9, 378.0 725.7 C 367.0 733.1, 352.0 728.6, 325.2 709.8 C 292.6 686.9, 278.5 683.4, 238.3 688.3 C 179.5 695.4, 153.1 732.8, 203.3 737.9 C 221.0 739.7, 239.0 745.7, 257.5 756.0 C 263.5 759.4, 272.5 764.2, 277.5 766.7 C 294.1 775.1, 308.7 787.2, 331.8 811.8 C 350.5 831.7, 356.2 835.4, 385.0 846.3 C 394.6 850.0, 405.5 856.2, 438.3 876.8 C 474.6 899.5, 471.4 890.0, 471.7 975.2 L 472.0 1044 566.4 1044 L 660.8 1044 661.2 973.2 C 661.7 895.2, 661.6 896.5, 668.3 876.2 C 673.6 860.5, 674.8 854.0, 676.5 834.2 C 677.3 824.5, 678.7 811.3, 679.7 805 C 685.1 769.2, 681.4 717.1, 669.0 655 C 656.6 593.0, 656.6 579.8, 669.0 536.0 C 674.2 517.6, 674.5 516.2, 676.9 497.5 C 678.1 488.7, 680.6 474.8, 682.4 466.5 C 695.5 408.5, 687.9 375.7, 662.5 381.1 C 648.0 384.2, 640.7 403.1, 631.0 462.7 C 629.8 470.0, 627.1 481.7, 625.0 488.7 C 622.9 495.7, 619.5 510.9, 617.5 522.5 C 611.4 556.6, 605.3 565.4, 591.0 561.1 C 578.1 557.2, 574.2 542.9, 571.9 491.0 C 570.9 468.3, 570.4 463.6, 566.4 442 C 563.0 423.1, 562.1 415.2, 561.0 394 C 560.4 383.8, 558.9 367.4, 557.5 357.5 C 556.2 347.6, 554.6 335.4, 554.0 330.5 C 551.4 309.4, 542.5 298.7, 527.5 298.6 C 508.7 298.4, 499.8 315.6, 503.9 344 C 504.5 347.5, 505.6 359.9, 506.5 371.5 C 507.3 383.0, 508.8 397.2, 509.7 403 C 510.9 410.9, 511.4 421.4, 511.5 446 C 511.6 474.2, 511.9 480.1, 513.8 491.2 C 519.2 522.9, 518.9 533, 512.5 533 C 506.0 533, 503.7 526.0, 493.4 476.5 C 487.8 449.1, 487.1 446.7, 480.5 426.7 C 474.9 409.5, 472.6 399.4, 468.5 373.5 C 467.1 364.7, 463.7 349.4, 461.0 339.5 C 458.3 329.6, 454.9 316.8, 453.5 311.1 C 447.1 285.9, 433.9 276.2, 417.2 284.5",
    box: { x: 177, y: 282, width: 512, height: 762 },
    size: 1,
  },
} as const;

/**
 * One raised open hand, the meme's gesture; `side` says which of the title it stands on.
 * Its width is `--hand-size` (set by the parent) times the hand's own size.
 */
export function RaisedHand({ side, className = "" }: { side: "left" | "right"; className?: string }) {
  const { d, box, size } = HANDS[side];
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className={className}
      style={{ width: `calc(var(--hand-size) * ${size})` }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
