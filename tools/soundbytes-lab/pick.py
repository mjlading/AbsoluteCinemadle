"""Pick films for new boards, without printing which ones: popular films whose famous lines and theme the
pipeline can find, since the game is hard and a board should get easy by its last clues.

Candidates come from the most-voted English films on TMDB, shuffled. Each is checked with what the build uses:
  - official English scene clips on YouTube, at least PICK_MIN_CLIPS (the film's own sound),
  - clips named after a line or scene ('"King of the World" Clip'), from TMDB's video names,
  - famous quotes on its Wikiquote page (bolded or captioned),
  - a theme: a soundtrack album by its composer on iTunes.
A film needs all of them. Of the first SHORTLIST_PER_PICK films per pick that pass, the best-scoring are picked,
one per main genre, so a pick is random enough not to be guessed, but never a film without iconic lines.
Picks go to work/picks.json under opaque slugs (board-1, board-2, ...); films already picked are skipped.

usage: python pick.py [count]
"""
import math, secrets, sys

from common import WORK, read_json, tmdb, write_json
from signals import quoted, wikiquote_quotes
from theme import composers, itunes_candidates

# build.py takes a film with 4 scene clips, but iconic lines need more: with 4, Back to the Future Part II's famous
# quotes were in none of them.
PICK_MIN_CLIPS = 6
MIN_VOTES = 8000  # on TMDB: films most players have seen
MIN_FAMOUS, MIN_NAMED_CLIPS = 2, 2
SHORTLIST_PER_PICK = 3

COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
PICKS = WORK / "picks.json"

picks = read_json(PICKS) if PICKS.exists() else []
used = {p["tmdb_id"] for p in picks}
numbers = [int(p["slug"].split("-")[1]) for p in picks if p["slug"].startswith("board-")]
next_number = max(numbers, default=0) + 1

pool = []
for page in range(1, 16):
    pool += [m for m in tmdb("/discover/movie", sort_by="vote_count.desc", **{"vote_count.gte": MIN_VOTES}, page=page)["results"]
             if m["id"] not in used and m.get("original_language") == "en"]
rng = secrets.SystemRandom()
rng.shuffle(pool)


def assess(m):
    """The film's score, or None when it lacks anything a board needs. Prints nothing about the film."""
    videos = tmdb(f"/movie/{m['id']}/videos", language="en-US")["results"]
    clips = [v for v in videos if v["site"] == "YouTube" and v["official"] and v["type"] == "Clip" and v.get("iso_639_1") == "en"]
    if len(clips) < PICK_MIN_CLIPS:
        return None
    named = sum(bool(quoted(v["name"])) for v in clips)
    if named < MIN_NAMED_CLIPS:
        return None
    year = int(m["release_date"][:4]) if m.get("release_date") else None
    famous = sum(f for _, f in wikiquote_quotes(m["title"], year))
    if famous < MIN_FAMOUS:
        return None
    if not itunes_candidates(m["title"], composers(m["id"])):
        return None
    return min(famous, 10) + min(named, 6) + 2 * math.log10(m["vote_count"])


shortlist, checked = [], 0
for m in pool:
    if len(shortlist) >= COUNT * SHORTLIST_PER_PICK:
        break
    checked += 1
    try:
        score = assess(m)
    except Exception:  # a lookup failed: just skip the film
        continue
    if score is not None:
        shortlist.append((score, m))

added, genres_taken, taken = 0, set(), set()
ranked = sorted(shortlist, key=lambda s: -s[0])
# One per main genre for variety first; few films pass every check, so the rest fill in by score.
for one_per_genre in (True, False):
    for score, m in ranked:
        if added == COUNT:
            break
        genre = (m.get("genre_ids") or [0])[0]
        if m["id"] in taken or (one_per_genre and genre in genres_taken):
            continue
        genres_taken.add(genre)
        taken.add(m["id"])
        picks.append({"slug": f"board-{next_number}", "tmdb_id": m["id"]})
        next_number += 1
        added += 1

write_json(PICKS, picks)
print(f"checked {checked} films, {len(shortlist)} had iconic lines and a theme; "
      + (f"picked {added}: " + ", ".join(p["slug"] for p in picks[-added:]) if added else "picked none"))
