/** A TMDB poster at the size its class gives it, or a blank frame when there is none. */
export function Poster({ src, className }: { src: string | null; className: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`shrink-0 rounded-[3px] object-cover ${className}`} />
  ) : (
    <span aria-hidden="true" className={`shrink-0 rounded-[3px] bg-ink/10 ${className}`} />
  );
}
