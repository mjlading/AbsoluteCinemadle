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
 */
const HANDS = {
  left: {
    d: "M 213.9 147.3 C 202.4 153.3, 201.2 174.6, 209.1 228.5 C 210.7 239.0, 211.4 250.4, 211.9 274.5 C 212.6 304.2, 212.9 308.2, 216.4 331.5 C 222.1 369.4, 221.5 377, 212.9 377 C 206.8 377, 205.0 373.8, 197.8 350.5 C 194.2 338.8, 190.1 328.8, 183.0 314 C 176.5 300.4, 171.7 288.9, 168.9 280 C 166.6 272.5, 163.3 261.7, 161.4 256 C 159.6 250.2, 156.2 239.2, 153.9 231.5 C 146.7 207.1, 140.4 200.2, 126.3 201.1 C 108.1 202.3, 104.5 214.4, 112.3 248.5 C 117.0 269.1, 119.0 275.9, 125.8 296.5 C 127.9 303.1, 130.9 313.6, 132.4 320 C 133.9 326.3, 136.3 335.9, 137.6 341.4 C 138.9 346.9, 145.1 364.0, 151.2 379.4 C 162.9 409.0, 164.6 415.6, 161.9 422.0 C 159.0 429.0, 150.8 432.0, 144.2 428.5 C 133.9 423.1, 100.7 377.8, 81.5 343 C 64.0 311.4, 58.1 305, 46.6 305 C 20.5 305, 21.9 335.4, 50.2 384.1 C 53.1 389.2, 58.7 399.2, 62.5 406.3 C 66.6 413.8, 73.1 423.8, 78.2 430.3 C 111.6 472.6, 109.9 469.4, 127.9 528 C 151.6 605.2, 167.3 640.8, 194.7 679.1 C 202.6 690.1, 197.1 689.4, 282.8 689.7 C 372.8 690.0, 368.8 690.8, 370.4 673.0 C 371.4 662.6, 372.6 659.4, 379.3 650.7 C 382.7 646.1, 389.7 636.4, 394.7 629 C 399.7 621.5, 407.6 611, 412.2 605.5 C 431.4 582.5, 451.3 556.4, 461.2 541.4 C 477.2 516.8, 486.5 508.5, 535.1 475.5 C 556.3 461.0, 558.3 454.0, 544.1 443.3 C 522.5 426.7, 482.2 435.1, 451.4 462.6 C 406.1 503.1, 380.3 497.4, 361.9 442.7 C 355.8 424.6, 354.5 386.2, 359.2 363.5 C 363.7 342.0, 367.0 316.6, 368.0 296.3 C 368.5 285.7, 369.4 271.8, 370.1 265.3 C 375.4 211.0, 359.3 174.0, 336.3 187.5 C 326.8 193.0, 323.0 209.6, 322.9 244.8 C 322.9 266.8, 322.2 272.4, 316.9 288.8 C 314.0 297.6, 311.9 307.3, 309.4 323.3 C 302.4 367.7, 300.8 372.3, 291.1 374.4 C 279.0 377.1, 275.5 368.7, 274.0 333.5 C 272.7 302.6, 271.0 288.4, 265.4 261.4 C 263.0 249.9, 259.9 232.5, 258.5 222.9 C 248.8 157.6, 235.8 135.7, 213.9 147.3",
    box: { x: 28, y: 144, width: 525, height: 545 },
  },
  right: {
    d: "M 380.0 185.1 C 360.2 188.7, 352.2 210.9, 348.9 271 C 347.6 295.6, 346.4 306.5, 342.9 324.8 C 338.0 350.2, 337.6 356.3, 338.2 396 C 338.9 448.8, 338.0 456.5, 329.9 463.3 C 319.2 472.3, 311.1 463.4, 306.5 438 C 299.8 400.6, 295.5 379.1, 291.9 366 C 287.3 348.7, 286.4 343.4, 284.5 318.6 C 279.3 253.6, 272.6 234.1, 254.4 231.4 C 226.5 227.2, 212.9 266.7, 222.8 323.5 C 224.4 332.6, 225.3 343.5, 225.9 360.5 C 226.9 387.1, 227.4 390.0, 235.4 425 C 238.5 438.4, 242.1 454.2, 243.5 460 C 251.6 495.6, 250.2 528.9, 238.7 569 C 227.1 609.7, 210.4 611.1, 179.8 573.8 C 149.6 536.8, 141.7 532.1, 98.5 524.4 C 40.7 514.1, 2.8 544.0, 49.5 563.0 C 70.1 571.3, 80.8 579.3, 108.5 606.6 C 130.2 628.0, 133.0 631.8, 147.9 659 C 168.4 696.4, 168.0 695.8, 189.8 713.3 C 205.5 726.0, 233.7 754.6, 251.9 776.5 C 262.5 789.1, 263.6 796.5, 257.7 814.5 C 241.3 864.3, 233.0 860.1, 347 859.7 C 450.5 859.4, 439.9 861.3, 450.9 840.5 C 453.2 836.2, 458.4 827.6, 462.5 821.4 C 470.7 809.2, 473.8 802.8, 480.4 785.1 C 482.8 778.7, 487.0 768.2, 489.8 761.8 C 506.5 723.0, 517.5 674.5, 520.9 625.5 C 526.1 550.5, 528.7 540.7, 554.3 498.0 C 561.3 486.3, 568.2 473.0, 573.1 462.0 C 577.3 452.3, 583.5 439.5, 586.9 433.5 C 596.2 417.0, 607.2 389.7, 609.9 376.6 C 614.1 356.4, 597.9 339.8, 581.1 347.0 C 570.2 351.7, 557.9 371.1, 535.1 419.7 C 532.7 424.7, 528.1 433.0, 524.8 438.2 C 521.5 443.3, 513.7 457.6, 507.4 470.1 C 493.0 498.6, 487.7 503.9, 476.8 500.9 C 461.3 496.6, 460.8 479.2, 474.5 424.9 C 478.6 408.3, 480.5 396.8, 482.0 378.5 C 483.3 361.3, 485.8 346.9, 490.3 328.2 C 492.3 320.4, 494.4 310.3, 495.0 305.7 C 495.6 301.2, 497.3 290.3, 498.6 281.5 C 504.0 247.1, 501.6 237.3, 486.4 229.9 C 467.3 220.7, 453.1 234.5, 447.4 267.8 C 446.0 275.8, 443.4 289.7, 441.5 298.5 C 439.6 307.3, 437.2 321.1, 436.0 329.1 C 434.0 343.1, 432.2 350.5, 423.5 378.5 C 421.3 385.7, 418.7 397.8, 416.9 409 C 411.4 444.2, 410.0 449, 405.5 449 C 400.0 449, 399.2 433.3, 402.5 391.6 C 403.5 379.2, 403.9 361.4, 403.8 339.6 C 403.7 310.1, 403.9 304.8, 405.8 291.5 C 408.1 275.9, 410.5 215.2, 409.3 206.5 C 407.1 191.7, 394.4 182.4, 380.0 185.1",
    box: { x: 29, y: 185, width: 582, height: 675 },
  },
} as const;

/** One raised open hand, the meme's gesture; `side` says which of the title it stands on. */
export function RaisedHand({ side, className = "" }: { side: "left" | "right"; className?: string }) {
  const { d, box } = HANDS[side];
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
