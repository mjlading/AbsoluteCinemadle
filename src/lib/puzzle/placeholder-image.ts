/** A square SVG frame with an emoji, standing in for real stills until TMDB images arrive. */
export function placeholderSvg(glyph: string, hue: number): string {
  const escaped = glyph.replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="light" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="hsl(${hue} 42% 46%)"/>
      <stop offset="1" stop-color="hsl(${hue} 38% 18%)"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#light)"/>
  <text x="200" y="214" font-size="190" text-anchor="middle" dominant-baseline="middle">${escaped}</text>
</svg>`;
}
