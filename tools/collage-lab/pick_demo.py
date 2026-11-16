"""Pick well-known films and TV series at random for a batch of dailies, without printing which ones.

The picks go to images/<prefix>-picks.json (gitignored) under opaque slugs <prefix>-1, <prefix>-2, ...,
each {"slug", "tmdb_id", "media_type": "movie" | "tv"}. The prefix defaults to "demo"; give each batch its own.
`series` of the picks are TV series, at random places in the batch (so the order says nothing either).
Titles either game already used are skipped (tools/used_films.py), and so is anything with too few textless backdrops.

usage: python pick_demo.py [count] [prefix] [series]
"""
import truststore; truststore.inject_into_ssl()
import json, re, secrets, sys, pathlib, requests

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import used_films

LAB = pathlib.Path(__file__).parent
env = (LAB.parent.parent / ".env.local").read_text()
H = {"Authorization": f"Bearer {re.search(r'^TMDB_READ_ACCESS_TOKEN=(.+)$', env, re.M).group(1).strip()}"}
COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
PREFIX = sys.argv[2] if len(sys.argv) > 2 else "demo"
SERIES = int(sys.argv[3]) if len(sys.argv) > 3 else 0
MIN_TEXTLESS = 70  # films near 45 textless backdrops left too few usable stills for 5 keywords (batch1)
API = "https://api.themoviedb.org/3"
# Well-known titles: most players have seen them. Series get fewer votes on TMDB than films of the same reach.
MIN_VOTES = {"movie": 6000, "tv": 4000}
# Live action only (animation frames would all be "drawings"); for series also no reality, talk, news, soap or kids shows.
WITHOUT_GENRES = {"movie": "16", "tv": "16|10764|10767|10763|10766|10762|99"}

used = used_films.used()
rng = secrets.SystemRandom()


def pool(media):
    found, page, pages = [], 1, 1
    while page <= pages:
        r = requests.get(f"{API}/discover/{media}", headers=H, timeout=30, params={
            "sort_by": "vote_count.desc", "vote_count.gte": MIN_VOTES[media], "without_genres": WITHOUT_GENRES[media],
            "page": page,
        }).json()
        pages, page = min(r["total_pages"], 500), page + 1
        found += [m for m in r["results"] if used_films.key(m["id"], media) not in used]
    rng.shuffle(found)
    return found


def pick(media, count, genres_taken):
    chosen = []
    for m in pool(media):
        if len(chosen) == count:
            break
        genre = (m.get("genre_ids") or [0])[0]
        if genre in genres_taken:  # one per main genre, for variety
            continue
        backdrops = requests.get(f"{API}/{media}/{m['id']}/images", headers=H, timeout=30).json().get("backdrops", [])
        if sum(1 for b in backdrops if b["iso_639_1"] is None) < MIN_TEXTLESS:
            continue
        genres_taken.add(genre)
        chosen.append({"tmdb_id": m["id"], "media_type": media})
    return chosen


genres = set()
titles = pick("tv", SERIES, genres) + pick("movie", COUNT - SERIES, genres)
rng.shuffle(titles)
picks = [{"slug": f"{PREFIX}-{i + 1}", **t} for i, t in enumerate(titles)]

(LAB / "images").mkdir(exist_ok=True)
(LAB / "images" / f"{PREFIX}-picks.json").write_text(json.dumps(picks))
used_films.record("close-ups", [used_films.key(p["tmdb_id"], p["media_type"]) for p in picks])
print(f"picked {len(picks)} titles: " + ", ".join(p["slug"] for p in picks))
