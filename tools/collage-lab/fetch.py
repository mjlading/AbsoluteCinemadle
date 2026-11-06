"""Download textless TMDB backdrops at full size for some films and drop exact duplicates.

Originals are mostly 1920-3840 px wide; small props are only usable as tiles at that size.

usage: python fetch.py <tmdb_movie_id>=<slug> [...]
"""
import truststore; truststore.inject_into_ssl()
import json, re, sys, pathlib, requests, io
from PIL import Image

LAB = pathlib.Path(__file__).parent
env = (LAB.parent.parent / ".env.local").read_text()
TOKEN = re.search(r"^TMDB_READ_ACCESS_TOKEN=(.+)$", env, re.M).group(1).strip()
H = {"Authorization": f"Bearer {TOKEN}"}
FILMS = {int(k): v for k, v in (a.split("=") for a in sys.argv[1:])}


def dhash(img, size=8):
    g = img.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.get_flattened_data())
    return sum(1 << i for i in range(size * size) if px[(i // size) * (size + 1) + i % size] > px[(i // size) * (size + 1) + i % size + 1])


for film_id, slug in FILMS.items():
    out = LAB / "images" / slug
    out.mkdir(parents=True, exist_ok=True)
    backdrops = requests.get(f"https://api.themoviedb.org/3/movie/{film_id}/images", headers=H, timeout=30).json()["backdrops"]
    textless = [b for b in backdrops if b["iso_639_1"] is None]
    kept, hashes, dupes = [], [], 0
    for i, b in enumerate(textless):
        data = requests.get(f"https://image.tmdb.org/t/p/original{b['file_path']}", timeout=120).content
        img = Image.open(io.BytesIO(data)).convert("RGB")
        h = dhash(img)
        if any(bin(h ^ o).count("1") <= 6 for o in hashes):
            dupes += 1
            continue
        hashes.append(h)
        name = f"{i:03d}.jpg"
        img.save(out / name, quality=92)
        kept.append({"file": name, "tmdb": b["file_path"], "w": img.width, "h": img.height})
    (out / "index.json").write_text(json.dumps(kept, indent=1))
    film = requests.get(f"https://api.themoviedb.org/3/movie/{film_id}?append_to_response=credits", headers=H, timeout=30).json()
    # Names that must not appear as text in a crop: director, the top 10 cast and their characters.
    names = [c["name"] for c in film["credits"]["crew"] if c["job"] == "Director"]
    names += [n for c in film["credits"]["cast"][:10] for n in (c["name"], c["character"])]
    (out / "meta.json").write_text(json.dumps({"tmdb_id": film_id, "title": film["title"], "names": names}))
    print(f"{slug}: {len(textless)} textless, {dupes} near-duplicates dropped, {len(kept)} kept")

