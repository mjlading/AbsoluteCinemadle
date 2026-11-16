"""Films the games have already used, so no film is picked twice, in either game.

The ledger is .data/used-films.json (gitignored, since it names the answers): {"movie:<tmdb id>": ["close-ups", ...]}.
Keys carry the media type, since TMDB's film and TV series ids overlap; a bare id (older ledgers) is a film.
It is filled three ways:
  - pick_demo.py (collage lab) and pick.py (Soundbytes lab) add every film they pick, whether or not it goes live;
  - `npm run db:used-films` adds every film in a database's Close-Ups puzzles and Soundbytes boards
    (run it with the production DATABASE_URL before picking, since lab folders get deleted after imports);
  - used() also reads both labs' own folders on this PC, so films picked before the ledger existed count too.

A film used by one game is skipped by both: a player who just saw it in one game should not meet it in the other.
"""
import json, pathlib

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = TOOLS.parent
LEDGER = ROOT / ".data" / "used-films.json"


def _read(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def _ledger():
    return _read(LEDGER) or {}


def key(tmdb_id, media_type="movie"):
    return f"{media_type}:{int(tmdb_id)}"


def _norm(k):
    return k if ":" in k else key(k)


def used():
    """Every title in the ledger or either lab's folders, as "movie:<id>" or "tv:<id>" keys (see key())."""
    ids = {_norm(k) for k in _ledger()}
    collage = TOOLS / "collage-lab" / "images"
    for f in list(collage.glob("*/meta.json")) + list((TOOLS / "soundbytes-lab" / "work").glob("*/meta.json")):
        meta = _read(f) or {}
        if meta.get("tmdb_id"):
            ids.add(key(meta["tmdb_id"], meta.get("media_type", "movie")))
    for f in list(collage.glob("*-picks*.json")) + [TOOLS / "soundbytes-lab" / "work" / "picks.json"]:
        for p in _read(f) or []:
            ids.add(key(p["tmdb_id"], p.get("media_type", "movie")))
    return ids


def record(game, keys):
    """Adds picked titles (key() strings) to the ledger under the game's name."""
    ledger = {_norm(k): v for k, v in _ledger().items()}
    for k in keys:
        ledger[k] = sorted(set(ledger.get(k, [])) | {game})
    LEDGER.parent.mkdir(exist_ok=True)
    LEDGER.write_text(json.dumps(ledger, indent=1, sort_keys=True))
