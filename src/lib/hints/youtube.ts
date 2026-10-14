const ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character video id from any common YouTube link (or a bare id), or null. */
export function parseYoutubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let candidate: string | null = null;
  if (host === "youtu.be") candidate = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    candidate = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

/** Parses "1:23.5", "83.5" or "83" into seconds, or null. */
export function parseSeconds(input: string): number | null {
  const parts = input.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

export function formatSeconds(seconds: number): string {
  const whole = Math.floor(seconds);
  const rest = Math.round((seconds - whole) * 10) / 10;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}${rest ? String(rest).slice(1) : ""}`;
}
