"""Pick well-known films at random for a demo, without printing which ones.

The picks go to images/demo-picks.json (gitignored) under opaque slugs demo-1, demo-2, ...
Films the lab already used are skipped, and so is anything with too few textless backdrops.

usage: python pick_demo.py [count]
"""
import truststore; truststore.inject_into_ssl()
import json, re, secrets, sys, pathlib, requests

LAB = pathlib.Path(__file__).parent
env = (LAB.parent.parent / ".env.local").read_text()
H = {"Authorization": f"Bearer {re.search(r'^TMDB_READ_ACCESS_TOKEN=(.+)$', env, re.M).group(1).strip()}"}
COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
MIN_TEXTLESS = 45
API = "https://api.themoviedb.org/3"

used = set()
for meta in (LAB / "images").glob("*/meta.json"):
    used.add(json.loads(meta.read_text())["tmdb_id"])

# Well-known live-action films: lots of votes, any genre but animation (frames would all be "drawings").
pool = []
for page in range(1, 11):
    r = requests.get(f"{API}/discover/movie", headers=H, timeout=30, params={
        "sort_by": "vote_count.desc", "vote_count.gte": 6000, "without_genres": 16, "page": page,
    }).json()
    pool += [m for m in r["results"] if m["id"] not in used]

rng = secrets.SystemRandom()
rng.shuffle(pool)
picks, genres_taken = [], set()
for m in pool:
    if len(picks) == COUNT:
        break
    genre = (m.get("genre_ids") or [0])[0]
    if genre in genres_taken:  # one per main genre, for variety
        continue
    backdrops = requests.get(f"{API}/movie/{m['id']}/images", headers=H, timeout=30).json().get("backdrops", [])
    if sum(1 for b in backdrops if b["iso_639_1"] is None) < MIN_TEXTLESS:
        continue
    genres_taken.add(genre)
    picks.append({"slug": f"demo-{len(picks) + 1}", "tmdb_id": m["id"]})

(LAB / "images").mkdir(exist_ok=True)
(LAB / "images" / "demo-picks.json").write_text(json.dumps(picks))
print(f"picked {len(picks)} films: " + ", ".join(p["slug"] for p in picks))
