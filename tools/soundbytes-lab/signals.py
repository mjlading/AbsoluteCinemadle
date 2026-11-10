"""Signals of which lines of a film are iconic, gathered without any key (see "Next" in docs/SOUNDBYTES.md):

- each official video's title, which often quotes the scene's famous line ("King of the World" Clip),
- its view count, and YouTube's most-replayed curve (the heatmap), whose peak often lands on the line,
- the film's Wikiquote page: its quotes, the famous ones in bold or as picture captions.

Cached in work/<slug>/signals.json. Nothing here is printed: titles and quotes would spoil the film.
"""
import re

import requests

from common import normalize, read_json, write_json

WIKIQUOTE = "https://en.wikiquote.org/w/api.php"
HEADERS = {"User-Agent": "soundbytes-lab/0.1 (offline film puzzle tool)"}


def video_info(key):
    import yt_dlp

    opts = {"quiet": True, "no_warnings": True, "skip_download": True, "js_runtimes": {"node": {}}}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={key}", download=False)
    except Exception:  # removed or private: no signals from it
        return None
    return {
        "title": info.get("title") or "",
        "views": info.get("view_count") or 0,
        "duration": info.get("duration") or 0,
        "heatmap": [[h["start_time"], h["end_time"], h["value"]] for h in info.get("heatmap") or []],
    }


def quoted(title):
    """The scene names a video title quotes: TITANIC | "King of the World" Clip -> ["King of the World"]."""
    return [q.strip() for q in re.findall(r"[\"“”']([^\"“”]{3,80})[\"“”']", title) if len(normalize(q)) >= 2]


def _strip_markup(text):
    text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", text)  # [[link|label]] -> label
    text = re.sub(r"\{\{[^}]*$|^[^{]*\}\}", "", text)  # a template cut off by a line break
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.replace("'''", "").replace("''", "").strip()


def wikiquote_quotes(title, year):
    """The film's quotes as [text, famous]: famous when bolded or used as a picture caption. Empty when
    no page clearly about this film is found."""
    hits = requests.get(WIKIQUOTE, headers=HEADERS, timeout=30, params={
        "action": "query", "list": "search", "srsearch": f"{title} {year or ''} film", "format": "json", "srlimit": 5,
    }).json()["query"]["search"]
    want = " ".join(normalize(title))
    for hit in hits:
        name = " ".join(normalize(re.sub(r"\(.*?\)", "", hit["title"])))
        if name != want:
            continue
        page = requests.get(WIKIQUOTE, headers=HEADERS, timeout=30, params={
            "action": "parse", "page": hit["title"], "prop": "wikitext", "format": "json", "formatversion": 2,
        }).json()
        text = page.get("parse", {}).get("wikitext", "")
        # Templates (dialogue boxes, notes) may span lines; their quotes are still listed on their own lines.
        text = re.sub(r"\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}", lambda m: m.group(0) if "\n" not in m.group(0) else "\n", text)
        if year and str(year) not in text[:3000]:
            continue  # another film of the same name
        quotes = []
        for caption in re.findall(r"\[\[File:[^\]|]*\|(?:[^\]|]*\|)*([^\]|]+)\]\]", text):
            quotes.append([_strip_markup(caption), True])
        for line in text.splitlines():
            m = re.match(r"^[*:]+\s*(.*)$", line)
            if not m or line.startswith("**"):  # notes on a quote, not quotes
                continue
            body = m.group(1)
            body = re.sub(r"^'''[^']+''':\s*", "", body)  # a speaker's name in dialogue
            famous = body.startswith("'''") and body.rstrip().endswith("'''")
            clean = _strip_markup(body)
            if len(normalize(clean)) >= 2:
                quotes.append([clean, famous])
        return quotes
    return []


def signals_step(meta, d):
    path = d / "signals.json"
    if path.exists():
        return read_json(path)
    videos = [video_info(v["key"]) for v in meta["videos"]]
    out = {"videos": videos, "quotes": wikiquote_quotes(meta["title"], meta.get("year"))}
    write_json(path, out)
    return out
