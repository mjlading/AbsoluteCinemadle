/** The day's prompt kinds: `count` different ones, in a seeded random order. */
export function pickKinds<T>(kinds: readonly T[], count: number, random: () => number): T[] {
  const out = [...kinds];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, Math.min(count, out.length));
}
