"""Pick well-known films at random for new boards, without printing which ones.

Each pick needs official English scene clips on YouTube (at least build.MIN_CLIPS): they are the film's own
sound, and the only way to tell a trailer's narrator from its characters. Picks go to work/picks.json
under opaque slugs (board-1, board-2, ...); films already picked are skipped.

usage: python pick.py [count]
"""
import secrets, sys

from common import WORK, read_json, tmdb, write_json

MIN_CLIPS = 4  # as in build.py

COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
PICKS = WORK / "picks.json"

picks = read_json(PICKS) if PICKS.exists() else []
used = {p["tmdb_id"] for p in picks}
numbers = [int(p["slug"].split("-")[1]) for p in picks if p["slug"].startswith("board-")]
next_number = max(numbers, default=0) + 1

# Well-known films: lots of votes. Animation is fine here, since only the sound counts.
pool = []
for page in range(1, 11):
    pool += [m for m in tmdb("/discover/movie", sort_by="vote_count.desc", **{"vote_count.gte": 6000}, page=page)["results"]
             if m["id"] not in used and m.get("original_language") == "en"]

rng = secrets.SystemRandom()
rng.shuffle(pool)
added, genres_taken = 0, set()
for m in pool:
    if added == COUNT:
        break
    genre = (m.get("genre_ids") or [0])[0]
    if genre in genres_taken:  # one per main genre, for variety
        continue
    videos = tmdb(f"/movie/{m['id']}/videos", language="en-US")["results"]
    clips = [v for v in videos if v["site"] == "YouTube" and v["official"] and v["type"] == "Clip" and v.get("iso_639_1") == "en"]
    if len(clips) < MIN_CLIPS:
        continue
    genres_taken.add(genre)
    picks.append({"slug": f"board-{next_number}", "tmdb_id": m["id"]})
    next_number += 1
    added += 1

write_json(PICKS, picks)
print(f"picked {added} films: " + ", ".join(p["slug"] for p in picks[-added:]) if added else "picked no films")
