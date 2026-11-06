"""Blind review of candidate collages: the owner rates tiles, the lab scores the models.

Every keyword row from every report.py run is shown in a shuffled order, without the model name.
Click a tile to cycle it through right / wrong label / spoiler (face, title text, iconic prop),
and mark each row as usable or not. Ratings are saved to review/ratings.json as you click, keyed by
tile image, so a rerun of report.py that changes a row keeps the marks on the tiles they were made on.
Tiles a rated row gains after a rerun are tagged "new" until the row is rated again.

usage: python review.py          # builds review/ and serves it on http://localhost:8765
       python review.py score    # per-model results from the saved ratings
"""
import hashlib, json, sys, pathlib, http.server
from PIL import Image

LAB = pathlib.Path(__file__).parent
OUT = LAB / "review"
RATINGS = OUT / "ratings.json"
TILE, SHOWN, PORT = 240, 6, 8765


def rows():
    """Every keyword row of every film and model, as (row id, film, model, label, tiles)."""
    for path in sorted((LAB / "detections").glob("*-keywords.json")):
        stem = path.name[:-len("-keywords.json")]
        film = next(d.name for d in (LAB / "images").iterdir() if stem.startswith(d.name + "-"))
        model = stem[len(film) + 1:]
        for label, hits in json.loads(path.read_text()).items():
            row_id = hashlib.sha1(f"{film}|{model}|{label}".encode()).hexdigest()[:10]
            yield row_id, film, model, label, list(hits.items())[:SHOWN]


def tile_name(film, file, d):
    """Named by frame and crop, so a rerun of report.py never shows a stale tile or misplaces a mark."""
    return hashlib.sha1(f"{film}|{file}|{d['crop']}".encode()).hexdigest()[:12] + ".jpg"


def build():
    (OUT / "tiles").mkdir(parents=True, exist_ok=True)
    data = []
    for row_id, film, model, label, tiles in rows():
        cells = []
        for n, (file, d) in enumerate(tiles):
            name = tile_name(film, file, d)
            if not (OUT / "tiles" / name).exists():
                Image.open(LAB / "images" / film / file).crop(d["crop"]).resize((TILE, TILE), Image.LANCZOS).save(OUT / "tiles" / name, quality=88)
            cells.append({"name": name, "src": f"tiles/{name}"})
        data.append({"id": row_id, "film": film, "label": label.strip("[]"), "group": label.startswith("["), "tiles": cells})
    data.sort(key=lambda r: r["id"])  # hash order: shuffled, and stable when more rows are added
    (OUT / "index.html").write_text(PAGE.replace("__DATA__", json.dumps(data)), encoding="utf-8")
    print(f"{len(data)} rows -> {OUT / 'index.html'}")


def score():
    ratings = json.loads(RATINGS.read_text()) if RATINGS.exists() else {}
    stats = {}
    for row_id, film, model, label, tiles in rows():
        r = ratings.get(row_id)
        if not r or not r.get("usable"):
            continue
        names = [tile_name(film, file, d) for file, d in tiles]
        marks, seen = r.get("tiles", {}), set(r.get("seen", []))
        # Unmarked tiles the owner saw count as right; tiles added since are not rated yet.
        rated = [marks.get(n, "right") if n in seen or n in marks else None for n in names]
        s = stats.setdefault(model, {"rows": 0, "usable": 0, "right": 0, "wrong": 0, "spoiler": 0, "collage_ok": 0, "unrated": 0})
        s["rows"] += 1
        s["usable"] += r["usable"] == "yes"
        for m in rated:
            s[m or "unrated"] += 1
        # The collage is the first 4 tiles: fine when none of them is wrong or a spoiler.
        s["collage_ok"] += all(m == "right" for m in rated[:4])
    print(f"{'model':10} {'rows':>4} {'usable':>6} {'collage ok':>10} {'tiles right':>11} {'wrong':>5} {'spoiler':>7} {'unrated':>7}")
    for model, s in sorted(stats.items()):
        tiles = s["right"] + s["wrong"] + s["spoiler"]
        print(f"{model:10} {s['rows']:4} {s['usable']:6} {s['collage_ok']:10} {s['right'] / max(tiles, 1):10.0%} {s['wrong']:5} {s['spoiler']:7} {s['unrated']:7}")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(OUT), **kw)

    def do_GET(self):
        if self.path == "/ratings":
            body = RATINGS.read_bytes() if RATINGS.exists() else b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/ratings":
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers["Content-Length"]))
        json.loads(body)  # refuse anything that is not JSON
        RATINGS.write_bytes(body)
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


PAGE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Collage review</title>
<style>
  :root { --bg: #141414; --panel: #1f1f1f; --fg: #eee; --muted: #999; --right: #3fb950; --wrong: #f85149; --spoiler: #f0a020; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.4 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 1; background: var(--bg); padding: 12px 16px; border-bottom: 1px solid #333; }
  header h1 { margin: 0 0 4px; font-size: 18px; }
  header p { margin: 0; color: var(--muted); font-size: 13px; }
  header h1 small { color: var(--muted); font-weight: normal; font-size: 14px; }
  .hide { float: right; font-size: 14px; font-weight: normal; color: var(--fg); cursor: pointer; }
  body.hide-done .row.done { display: none; }
  .legend span { display: inline-block; padding: 0 6px; border-radius: 4px; margin-right: 6px; color: #000; }
  main { padding: 8px 16px 40px; max-width: 1560px; margin: 0 auto; }
  .row { background: var(--panel); border-radius: 8px; padding: 12px; margin: 12px 0; }
  .row h2 { margin: 0 0 8px; font-size: 16px; display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .row h2 small { color: var(--muted); font-weight: normal; }
  .tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
  .tile { position: relative; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 4px; overflow: hidden; outline: 3px solid transparent; outline-offset: -3px; }
  .tile img { display: block; width: 100%; aspect-ratio: 1; }
  .tile.spare { opacity: .75; }
  .tile.collage-end { margin-right: 10px; }
  .tile[data-mark=right] { outline-color: var(--right); }
  .tile[data-mark=wrong] { outline-color: var(--wrong); }
  .tile[data-mark=spoiler] { outline-color: var(--spoiler); }
  .tile .new { position: absolute; right: 4px; top: 4px; padding: 0 5px; border-radius: 3px; font-size: 12px; background: #58a6ff; color: #000; }
  .tile .tag { position: absolute; left: 4px; bottom: 4px; padding: 0 5px; border-radius: 3px; font-size: 12px; color: #000; background: #fff; display: none; }
  .tile[data-mark] .tag { display: block; }
  .tile[data-mark=right] .tag { background: var(--right); }
  .tile[data-mark=wrong] .tag { background: var(--wrong); }
  .tile[data-mark=spoiler] .tag { background: var(--spoiler); }
  .tile:focus-visible { outline-color: #fff; }
  .usable { margin-top: 8px; display: flex; gap: 8px; align-items: center; color: var(--muted); font-size: 13px; }
  .usable button { font: inherit; padding: 4px 12px; border-radius: 4px; border: 1px solid #555; background: none; color: var(--fg); cursor: pointer; }
  .usable button[aria-pressed=true] { background: var(--fg); color: #000; }
  @media (max-width: 760px) { .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } .tile.collage-end { margin-right: 0; } }
</style></head><body>
<header><h1>Collage review <small id="progress"></small> <label class="hide"><input type="checkbox" id="hide-done"> Hide finished rows</label></h1>
<p class="legend">Click a tile to cycle: <span style="background:var(--right)">right</span><span style="background:var(--wrong)">wrong label</span><span style="background:var(--spoiler)">spoiler</span> (face, title text, iconic prop). Unmarked tiles count as right. The first four tiles are the collage; the faded ones are spares. Saved as you click.</p></header>
<main id="rows"></main>
<script>
const DATA = __DATA__;
const MARKS = [undefined, "right", "wrong", "spoiler"];
let ratings = {};
const save = () => fetch("/ratings", { method: "POST", body: JSON.stringify(ratings) });
const isDone = row => {
  const r = ratings[row.id];
  return r && r.usable && row.tiles.every(t => (r.seen || []).includes(t.name));
};
const progress = () => {
  const done = DATA.filter(isDone).length;
  document.getElementById("progress").textContent = `${done} of ${DATA.length} rows done`;
  DATA.forEach(row => row.el && row.el.classList.toggle("done", !!isDone(row)));
};
function render() {
  const main = document.getElementById("rows");
  DATA.forEach((row, i) => {
    const r = ratings[row.id] || (ratings[row.id] = { tiles: {}, seen: [] });
    r.seen = r.seen || [];
    const wasRated = !!r.usable;
    // Any click on a row means the owner has looked at all of its current tiles.
    const markSeen = () => { r.seen = [...new Set([...r.seen, ...row.tiles.map(t => t.name)])]; el.querySelectorAll(".tile .new").forEach(x => x.remove()); };
    const el = document.createElement("section");
    el.className = "row";
    row.el = el;
    el.innerHTML = `<h2>${i + 1}. ${row.label}${row.group ? " (group)" : ""} <small>${row.film}</small></h2><div class="tiles"></div>
      <div class="usable">Usable as a keyword? <button data-v="yes">Yes</button><button data-v="no">No</button></div>`;
    const tiles = el.querySelector(".tiles");
    row.tiles.forEach((t, n) => {
      const b = document.createElement("button");
      b.className = "tile" + (n >= 4 ? " spare" : "") + (n === 3 ? " collage-end" : "");
      b.innerHTML = `<img src="${t.src}" alt="Tile ${n + 1} of row ${i + 1}" loading="lazy"><span class="tag"></span>`
        + (wasRated && !r.seen.includes(t.name) ? '<span class="new">new</span>' : "");
      const show = () => {
        const m = r.tiles[t.name];
        if (m) { b.dataset.mark = m; b.querySelector(".tag").textContent = m; } else delete b.dataset.mark;
      };
      b.onclick = () => {
        const next = MARKS[(MARKS.indexOf(r.tiles[t.name]) + 1) % MARKS.length];
        if (next) r.tiles[t.name] = next; else delete r.tiles[t.name];
        markSeen(); show(); save(); progress();
      };
      show();
      tiles.append(b);
    });
    el.querySelectorAll(".usable button").forEach(b => {
      b.setAttribute("aria-pressed", r.usable === b.dataset.v);
      b.onclick = () => {
        r.usable = b.dataset.v;
        markSeen();
        el.querySelectorAll(".usable button").forEach(x => x.setAttribute("aria-pressed", x === b));
        save(); progress();
      };
    });
    main.append(el);
  });
  progress();
}
const hide = document.getElementById("hide-done");
try { hide.checked = localStorage.getItem("hide-done") === "1"; } catch (e) {}
document.body.classList.toggle("hide-done", hide.checked);
hide.onchange = () => {
  document.body.classList.toggle("hide-done", hide.checked);
  try { localStorage.setItem("hide-done", hide.checked ? "1" : "0"); } catch (e) {}
};
fetch("/ratings").then(r => r.json()).then(j => { ratings = j; render(); });
</script></body></html>
"""

if __name__ == "__main__":
    if sys.argv[1:] == ["score"]:
        score()
    else:
        build()
        print(f"serving on http://localhost:{PORT}")
        http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
