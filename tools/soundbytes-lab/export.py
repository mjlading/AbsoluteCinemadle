"""Turn built films into Soundbytes boards for the app: .data/soundbytes/boards.json plus clips/*.mp3 (gitignored).

Load them with `npm run db:import-soundbytes -- .data/soundbytes/boards.json --from=YYYY-MM-DD` from the repo
root, which dates them one a day from that date.

A board has 5 clues, opened one at a time: each wrong guess or skip opens the next. They get easier: ordinary
lines from a side character and a lead, the two most iconic lines, then the film's theme, an iTunes preview played
from Apple's servers (never copied here). A film without a theme gets a third iconic line in its place.
A film with fewer than 5 lines gets no board.
Board, node and clip ids are random, so they say nothing about the film.
Slugs starting with "test-" are left out unless named.

usage: python export.py [slug ...]
"""
import shutil, sys

from common import EXPORT, WORK, new_id, read_json, write_json

NODES = 5

picks = read_json(WORK / "picks.json")
wanted = set(sys.argv[1:])
clips_dir = EXPORT / "clips"
shutil.rmtree(clips_dir, ignore_errors=True)
clips_dir.mkdir(parents=True)


def file_clip(d, clip):
    clip_id = new_id()
    shutil.copyfile(d / clip["file"], clips_dir / f"{clip_id}.mp3")
    return {"id": clip_id, "contentType": "audio/mpeg", "seconds": clip["seconds"], "mouth": clip["mouth"]}


boards, skipped = [], []
for pick in picks:
    slug = pick["slug"]
    if (wanted and slug not in wanted) or (not wanted and slug.startswith("test-")):
        continue
    d = WORK / slug
    if not (d / "lines.json").exists():
        skipped.append(f"{slug} (not built)")
        continue
    meta, lines = read_json(d / "meta.json"), read_json(d / "lines.json")
    if len(lines) < NODES:
        skipped.append(f"{slug} ({len(lines)} lines)")
        continue
    lines = sorted(lines, key=lambda l: l["slot"])[:NODES]
    theme = (read_json(d / "theme.json") if (d / "theme.json").exists() else {}).get("theme")
    if theme:
        lines = lines[:2] + lines[3:]  # the theme takes the least iconic line's place
    nodes = [{
        "id": new_id(6), "slot": slot, "label": f"Line {slot + 1}", "category": "dialogue", "art": None,
        "clip": file_clip(d, line["clip"]),
        "source": {"kind": "youtube", "id": line["video_key"], "at": line["start"]},
    } for slot, line in enumerate(lines)]
    if theme:
        nodes.append({
            "id": new_id(6), "slot": len(nodes), "label": "Theme", "category": "score", "art": None,
            "clip": {"url": theme["previewUrl"], "start": theme["start"], "seconds": theme["seconds"]},
            "source": {"kind": "itunes", "id": str(theme["trackId"]), "at": theme["start"]},
        })
    boards.append({
        "id": new_id(8),
        "name": f"Demo {len(boards) + 1}",
        "answer": {"tmdbId": meta["tmdb_id"], "title": meta["title"], "year": meta["year"],
                   "posterPath": meta["poster_path"], "cast": meta["cast"],
                   "themeUrl": theme["trackViewUrl"] if theme else None},
        "nodes": nodes,
    })

write_json(EXPORT / "boards.json", {"boards": boards})
print(f"exported {len(boards)} boards -> .data/soundbytes/boards.json" + (f"; skipped {', '.join(skipped)}" if skipped else ""))
