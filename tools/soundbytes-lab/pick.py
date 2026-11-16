"""Pick films for new boards, without printing which ones: popular films whose famous lines and theme the
pipeline can find, since the game is hard and a board should get easy by its last clues.

Candidates come from the most-voted English films on TMDB, shuffled. Each is checked with what the build uses:
  - official English scene clips on YouTube, at least PICK_MIN_CLIPS (the film's own sound),
  - clips named after a line or scene ('"King of the World" Clip'), from TMDB's video names,
  - famous quotes on its Wikiquote page (bolded or captioned),
  - a theme: a soundtrack album by its composer on iTunes,
  - and at least PICK_MIN_CLIPS of those clips downloadable from here (some are region-locked, age-gated or gone).
A film needs all of them. Of the first SHORTLIST_PER_PICK films per pick that pass, the best-scoring are picked,
one per main genre, so a pick is random enough not to be guessed, but never a film without iconic lines.
Picks go to work/picks.json under opaque slugs (board-1, board-2, ...); films either game already used are skipped
(tools/used_films.py).

usage: python pick.py [count]
"""
import math, pathlib, secrets, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import used_films

from common import WORK, read_json, tmdb, write_json
from signals import quoted, wikiquote_quotes
from theme import composers, itunes_candidates

# build.py takes a film with 4 scene clips, but iconic lines need more: with 4, Back to the Future Part II's famous
# quotes were in none of them.
PICK_MIN_CLIPS = 6
MIN_VOTES = 6000  # on TMDB: films most players have seen; 8000 left too few unused films that pass every check (batch 2)
MIN_FAMOUS, MIN_NAMED_CLIPS = 2, 2
SHORTLIST_PER_PICK = 3

COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
PICKS = WORK / "picks.json"

picks = read_json(PICKS) if PICKS.exists() else []
used = used_films.used()
numbers = [int(p["slug"].split("-")[1]) for p in picks if p["slug"].startswith("board-")]
next_number = max(numbers, default=0) + 1

pool = []
page, pages = 1, 1
while page <= pages:  # every film above MIN_VOTES
    found = tmdb("/discover/movie", sort_by="vote_count.desc", **{"vote_count.gte": MIN_VOTES}, page=page)
    pages, page = min(found["total_pages"], 500), page + 1
    pool += [m for m in found["results"]
             if used_films.key(m["id"]) not in used and m.get("original_language") == "en"]
rng = secrets.SystemRandom()
rng.shuffle(pool)


def downloadable(videos):
    """How many of the videos yt-dlp can fetch from here, checked without downloading; stops once there are enough."""
    import yt_dlp

    opts = {"quiet": True, "no_warnings": True, "skip_download": True, "js_runtimes": {"node": {}}}
    ok = 0
    with yt_dlp.YoutubeDL(opts) as ydl:
        for v in videos:
            try:
                ydl.extract_info(f"https://www.youtube.com/watch?v={v['key']}", download=False, process=False)
                ok += 1
            except Exception:
                continue
            if ok >= PICK_MIN_CLIPS:
                break
    return ok


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
    if downloadable(clips) < PICK_MIN_CLIPS:
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
used_films.record("soundbytes", [used_films.key(p["tmdb_id"]) for p in picks[len(picks) - added:]])
print(f"checked {checked} films, {len(shortlist)} had iconic lines and a theme; "
      + (f"picked {added}: " + ", ".join(p["slug"] for p in picks[-added:]) if added else "picked none"))
