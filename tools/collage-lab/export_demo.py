"""Export curated keyword collages as a puzzle file (.data/keyword-collage.json, gitignored) for the app.

Load it with `npm run db:import-collage -- .data/keyword-collage.json` from the repo root.

The curation file (images/demo-curation.json, gitignored) is what the admin decides per film:
which report rows become keywords, their display label, their tier (which sets the point cost) and
which one is the free starter, and the day it is the daily Close-Ups puzzle ("date", YYYY-MM-DD;
leave it out for an undated puzzle, which players never see). For example:

  {"demo-1": {"name": "Day 1", "date": "2026-11-10", "keywords": [
     {"label": "Hands", "tier": "hard", "free": true, "source": "mmdino", "row": "hand"},
     {"label": "Food", "tier": "medium", "source": "sam3", "row": "food", "skip": ["031.jpg"]}]}}

A keyword takes the frames listed in "frames" (curate.py), or else the first 4 tiles of that report
row after any frames listed in "skip".
Tile and puzzle ids are random, so they say nothing about the film.

usage: python export_demo.py [curation files..., default images/demo-curation.json]
"""
import truststore; truststore.inject_into_ssl()
import json, re, sys, secrets, string, pathlib, requests

LAB = pathlib.Path(__file__).parent
ROOT = LAB.parent.parent
OUT = ROOT / ".data" / "keyword-collage.json"
TILES = 4
H = {"Authorization": f"Bearer {re.search(r'^TMDB_READ_ACCESS_TOKEN=(.+)$', (ROOT / '.env.local').read_text(), re.M).group(1).strip()}"}
ALPHABET = string.ascii_letters + string.digits


def new_id(n=12):
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


curation = {}
for path in sys.argv[1:] or [LAB / "images" / "demo-curation.json"]:
    for slug, spec in json.loads(pathlib.Path(path).read_text(encoding="utf-8-sig")).items():
        if slug.startswith("_"):
            continue
        if slug in curation:
            raise SystemExit(f"{slug} is in more than one curation file")
        if path != LAB / "images" / "demo-curation.json" and not spec.get("approved"):
            print(f"warning: {slug} is not approved")
        curation[slug] = spec
puzzles = []
for slug, spec in curation.items():
    meta = json.loads((LAB / "images" / slug / "meta.json").read_text())
    index = {it["file"]: it for it in json.loads((LAB / "images" / slug / "index.json").read_text())}
    film = requests.get(f"https://api.themoviedb.org/3/movie/{meta['tmdb_id']}", headers=H, timeout=30).json()
    keywords = []
    for kw in spec["keywords"]:
        rows = json.loads((LAB / "detections" / f"{slug}-{kw['source']}-keywords.json").read_text())
        row = rows[kw["row"]]
        if "frames" in kw:  # exact tiles, in order (curate.py)
            hits = [(f, row[f]) for f in kw["frames"]]
        else:
            hits = [(f, d) for f, d in row.items() if f not in kw.get("skip", [])][:TILES]
        if len(hits) < TILES:
            raise SystemExit(f"{slug} {kw['label']}: only {len(hits)} tiles")
        tiles = []
        for file, d in hits:
            src = index[file]
            x0, y0, x1, y1 = d["crop"]
            w, h = src["w"], src["h"]
            tiles.append({
                "id": new_id(),
                "image": {"kind": "tmdb", "source": "backdrop", "path": src["tmdb"],
                          "crop": {"x": x0 / w, "y": y0 / h, "width": (x1 - x0) / w, "height": (y1 - y0) / h}},
                "frame": {"width": w, "height": h},
            })
        keywords.append({"id": new_id(), "label": kw["label"], "tier": kw["tier"], "free": bool(kw.get("free")), "tiles": tiles})
    keywords.sort(key=lambda k: not k["free"])
    year = int(film["release_date"][:4]) if film.get("release_date") else None
    puzzles.append({
        "id": new_id(8),
        "name": spec["name"],
        "date": spec.get("date"),
        "answer": {"tmdbId": film["id"], "title": film["title"], "originalTitle": film.get("original_title"),
                   "year": year, "posterPath": film.get("poster_path")},
        "keywords": keywords,
    })

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps({"puzzles": puzzles}, indent=1))
print(f"exported {len(puzzles)} puzzles, {sum(len(p['keywords']) for p in puzzles)} keywords -> {OUT.relative_to(ROOT)}")
