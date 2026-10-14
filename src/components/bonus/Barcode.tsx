import Image from "next/image";
import type { CSSProperties } from "react";

import type { PublicBarcode } from "@/lib/puzzle/types";

/**
 * A film barcode: vertical bands of colour (or the admin's uploaded image).
 * It "develops" in, like a print in the tray; `delay` staggers a set of them.
 */
export function Barcode({ barcode, delay = 0 }: { barcode: PublicBarcode; delay?: number }) {
  const style = { animationDelay: `${delay}ms` } as CSSProperties;
  if (barcode.imageUrl) {
    return (
      <span className="barcode relative block h-full w-full overflow-hidden" style={style}>
        <Image src={barcode.imageUrl} alt="" fill unoptimized sizes="34rem" className="object-cover" />
      </span>
    );
  }
  return (
    <span className="barcode flex h-full w-full" style={style}>
      {barcode.colors?.map((color, i) => (
        <span key={i} className="h-full flex-1" style={{ background: color }} />
      ))}
    </span>
  );
}
