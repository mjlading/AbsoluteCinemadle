"""The film's theme, for a board's last clue: an iTunes Search API preview, played unaltered from Apple's servers.

1. Candidates: songs from the iTunes Search API (no key) on a soundtrack album named after the film, by its composer
   from TMDB ("Original Music Composer"), so a cover band's album of the same name doesn't count.
   The first one is the theme: iTunes' order follows popularity, with theme-like names ("Main Title", "Love Theme")
   moved ahead. On the demo films it named the right track every time ("My Heart Will Go On", Back to the Future's
   "Main Title", the Wonder Woman theme).
   Matching the previews against the film's own official videos was tried and dropped: those are mostly dialogue
   scenes, and every cue of a score matched them about as well, the theme no better.
2. Its 30-second preview (which Apple already cuts around the hook) is fetched to this PC for analysis only, never
   rehosted, and the clue is its loudest WINDOW_S seconds.
3. A window that sings the title is moved, or the next candidate taken.

Cached in work/<slug>/theme.json. Nothing is printed but counts: titles would spoil the film.
"""
import requests

from common import WORK, decode, normalize, read_json, rms, tmdb, write_json

ITUNES = "https://itunes.apple.com/search"
HEADERS = {"User-Agent": "soundbytes-lab/0.1 (offline film puzzle tool)"}
PREVIEW_HOST = "https://audio-ssl.itunes.apple.com/"
WINDOW_S = 12.0  # the theme clue's length
CANDIDATES = 4
RATE = 16_000
SOUNDTRACK_WORDS = ("soundtrack", "score", "motion picture", "music from", "music inspired", "film")
THEME_WORDS = ("theme", "main title", "suite", "end title", "end credits", "prologue")


def composers(tmdb_id):
    crew = tmdb(f"/movie/{tmdb_id}/credits")["crew"]
    return [c["name"] for c in crew if c["job"] == "Original Music Composer"]


def itunes_candidates(title, names):
    """Songs on a soundtrack album named after the film, by its composer, in iTunes' own order (its relevance
    and popularity), theme-like track names a little ahead."""
    title_words = " ".join(normalize(title.split(":")[0]))
    surnames = [normalize(n)[-1] for n in names if normalize(n)]
    seen, out = set(), []
    for term in [f"{title} soundtrack", *(f"{title} {n}" for n in names)]:
        results = requests.get(ITUNES, headers=HEADERS, timeout=30, params={
            "term": term, "media": "music", "entity": "song", "limit": 50, "country": "US",
        }).json()["results"]
        for r in results:
            album, artist = " ".join(normalize(r.get("collectionName", ""))), normalize(r.get("artistName", ""))
            url = r.get("previewUrl") or ""
            if r.get("trackId") in seen or not url.startswith(PREVIEW_HOST):
                continue
            if title_words not in album or not any(w in album for w in SOUNDTRACK_WORDS):
                continue
            if surnames and not any(s in artist for s in surnames):
                continue
            seen.add(r["trackId"])
            out.append({"trackId": r["trackId"], "previewUrl": url, "trackViewUrl": r.get("trackViewUrl"),
                        "rank": len(out), "themey": any(w in r.get("trackName", "").lower() for w in THEME_WORDS)})
    return sorted(out, key=lambda c: c["rank"] - 3 * c["themey"])[:CANDIDATES]


def windows(samples, seconds):
    """Starts of every window, loudest first, half a second apart."""
    n = int(seconds * RATE)
    starts = range(0, max(1, samples.size - n + 1), RATE // 2)
    return sorted(starts, key=lambda a: -rms(samples[a:a + n]))


def theme_step(slug, meta, d, log):
    path = d / "theme.json"
    if path.exists():
        return read_json(path)
    from build import says_forbidden, title_rule, transcribe

    candidates = itunes_candidates(meta["title"], composers(meta["tmdb_id"]))
    rule = title_rule(meta["title_names"])
    folder = d / "theme"
    folder.mkdir(exist_ok=True)
    for n, c in enumerate(candidates):
        file = folder / f"{c['trackId']}.m4a"
        if not file.exists():
            file.write_bytes(requests.get(c["previewUrl"], headers=HEADERS, timeout=60).content)
        samples = decode(file, RATE, 1)[0]
        span = min(WINDOW_S, samples.size / RATE)
        for a in windows(samples, span)[:6]:
            sung = " ".join(w["text"] for s in transcribe(samples[a:a + int(span * RATE)]) for w in s["words"])
            if sung and says_forbidden(sung, rule):
                continue
            theme = {"trackId": c["trackId"], "previewUrl": c["previewUrl"], "trackViewUrl": c["trackViewUrl"],
                     "start": round(a / RATE, 2), "seconds": round(float(span), 2)}
            write_json(path, {"theme": theme})
            log(slug, f"theme: candidate {n + 1} of {len(candidates)}")
            return {"theme": theme}
    log(slug, "no theme: no soundtrack on iTunes, or every window sings the title")
    write_json(path, {"theme": None})
    return {"theme": None}


if __name__ == "__main__":
    import sys

    from build import log

    for pick in read_json(WORK / "picks.json"):
        if pick["slug"] in sys.argv[1:]:
            d = WORK / pick["slug"]
            theme_step(pick["slug"], read_json(d / "meta.json"), d, log)
