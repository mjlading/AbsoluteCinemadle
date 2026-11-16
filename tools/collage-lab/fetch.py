"""Download textless TMDB backdrops at full size for some films or TV series and drop exact duplicates.

Originals are mostly 1920-3840 px wide; small props are only usable as tiles at that size.

usage: python fetch.py <tmdb_movie_id>=<slug> tv:<tmdb_tv_id>=<slug> [...]
"""
import truststore; truststore.inject_into_ssl()
import json, re, sys, time, pathlib, requests, io
from PIL import Image

LAB = pathlib.Path(__file__).parent
env = (LAB.parent.parent / ".env.local").read_text()
TOKEN = re.search(r"^TMDB_READ_ACCESS_TOKEN=(.+)$", env, re.M).group(1).strip()
H = {"Authorization": f"Bearer {TOKEN}"}
# (media type, id) -> slug; a bare id is a film.
FILMS = {(k.split(":")[0] if ":" in k else "movie", int(k.split(":")[-1])): v for k, v in (a.split("=") for a in sys.argv[1:])}


def dhash(img, size=8):
    g = img.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.get_flattened_data())
    return sum(1 << i for i in range(size * size) if px[(i // size) * (size + 1) + i % size] > px[(i // size) * (size + 1) + i % size + 1])


def download(path, tries=3):
    for attempt in range(tries):
        try:
            data = requests.get(f"https://image.tmdb.org/t/p/original{path}", timeout=120).content
            return Image.open(io.BytesIO(data)).convert("RGB")
        except (requests.RequestException, OSError):
            time.sleep(2 * (attempt + 1))
    return None


for (media, film_id), slug in FILMS.items():
    out = LAB / "images" / slug
    out.mkdir(parents=True, exist_ok=True)
    backdrops = requests.get(f"https://api.themoviedb.org/3/{media}/{film_id}/images", headers=H, timeout=30).json()["backdrops"]
    textless = [b for b in backdrops if b["iso_639_1"] is None]
    kept, hashes, dupes = [], [], 0
    for i, b in enumerate(textless):
        img = download(b["file_path"])
        if img is None:  # TMDB sent something that isn't an image, three times: leave that backdrop out
            continue
        h = dhash(img)
        if any(bin(h ^ o).count("1") <= 6 for o in hashes):
            dupes += 1
            continue
        hashes.append(h)
        name = f"{i:03d}.jpg"
        img.save(out / name, quality=92)
        kept.append({"file": name, "tmdb": b["file_path"], "w": img.width, "h": img.height})
    (out / "index.json").write_text(json.dumps(kept, indent=1))
    # Names that must not appear as text in a crop: director (a series' creators), the top 10 cast and their characters.
    if media == "tv":
        film = requests.get(f"https://api.themoviedb.org/3/tv/{film_id}?append_to_response=aggregate_credits", headers=H, timeout=30).json()
        title = film["name"]
        names = [c["name"] for c in film.get("created_by", [])]
        names += [n for c in film["aggregate_credits"]["cast"][:10]
                  for n in (c["name"], *(r["character"] for r in c.get("roles", [])[:1])) if n]
    else:
        film = requests.get(f"https://api.themoviedb.org/3/movie/{film_id}?append_to_response=credits", headers=H, timeout=30).json()
        title = film["title"]
        names = [c["name"] for c in film["credits"]["crew"] if c["job"] == "Director"]
        names += [n for c in film["credits"]["cast"][:10] for n in (c["name"], c["character"]) if n]
    (out / "meta.json").write_text(json.dumps({"tmdb_id": film_id, "media_type": media, "title": title, "names": names}))
    print(f"{slug}: {len(textless)} textless, {dupes} near-duplicates dropped, {len(kept)} kept")

