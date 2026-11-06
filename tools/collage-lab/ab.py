"""Quick blind A/B test of two detectors: 20 pairs of collages, pick the better one.

For keywords both models found in the same film, the two 2x2 collages are shown side by side in a
random order. Picks are saved to review-ab/picks.json as you click.

usage: python ab.py [model_a model_b]   # default sam3 mmdino; serves http://localhost:8766
       python ab.py score               # results from the saved picks
"""
import hashlib, json, random, sys, pathlib, http.server
from PIL import Image

LAB = pathlib.Path(__file__).parent
OUT = LAB / "review-ab"
PICKS = OUT / "picks.json"
PAIRS = OUT / "pairs.json"
TILE, PORT, N, PER_FILM = 200, 8766, 20, 4


def keywords(film, model):
    path = LAB / "detections" / f"{film}-{model}-keywords.json"
    return json.loads(path.read_text()) if path.exists() else {}


def collage(film, hits):
    """The first 4 tiles of a keyword row as one 2x2 image; returns its file name."""
    tiles = list(hits.items())[:4]
    name = hashlib.sha1(json.dumps([(film, f, d["crop"]) for f, d in tiles]).encode()).hexdigest()[:12] + ".jpg"
    if not (OUT / name).exists():
        sheet = Image.new("RGB", (2 * TILE + 4, 2 * TILE + 4), (20, 20, 20))
        for n, (file, d) in enumerate(tiles):
            tile = Image.open(LAB / "images" / film / file).crop(d["crop"]).resize((TILE, TILE), Image.LANCZOS)
            sheet.paste(tile, ((n % 2) * (TILE + 4), (n // 2) * (TILE + 4)))
        sheet.save(OUT / name, quality=88)
    return name


def build(a, b):
    OUT.mkdir(exist_ok=True)
    rng = random.Random(11)
    pairs = []
    films = sorted(d.name for d in (LAB / "images").iterdir())
    for film in films:
        ka, kb = keywords(film, a), keywords(film, b)
        shared = [l for l in ka if l in kb and not l.startswith("[")]
        rng.shuffle(shared)
        for label in shared[:PER_FILM]:
            sides = [(a, collage(film, ka[label])), (b, collage(film, kb[label]))]
            rng.shuffle(sides)  # blind: which side is which model is random per pair
            pairs.append({"id": f"{film}|{label}", "film": film, "label": label,
                          "left": sides[0][1], "right": sides[1][1], "models": [sides[0][0], sides[1][0]]})
    rng.shuffle(pairs)
    pairs = pairs[:N]
    PAIRS.write_text(json.dumps(pairs, indent=1))
    public = [{k: p[k] for k in ("id", "film", "label", "left", "right")} for p in pairs]
    (OUT / "index.html").write_text(PAGE.replace("__DATA__", json.dumps(public)), encoding="utf-8")
    print(f"{len(pairs)} pairs ({a} vs {b}) -> http://localhost:{PORT}")


def score():
    pairs = json.loads(PAIRS.read_text())
    picks = json.loads(PICKS.read_text()) if PICKS.exists() else {}
    tally = {}
    for p in pairs:
        pick = picks.get(p["id"])
        if not pick:
            continue
        a, b = p["models"]
        key = {"left": a, "right": b}.get(pick, pick)  # left/right -> model name; "both"/"neither" stay
        tally[key] = tally.get(key, 0) + 1
        print(f"  {p['film']:20} {p['label']:12} -> {key}")
    print(f"{sum(tally.values())} of {len(pairs)} picked:", ", ".join(f"{k} {v}" for k, v in sorted(tally.items(), key=lambda kv: -kv[1])))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(OUT), **kw)

    def do_GET(self):
        if self.path == "/picks":
            body = PICKS.read_bytes() if PICKS.exists() else b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/picks":
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers["Content-Length"]))
        json.loads(body)
        PICKS.write_bytes(body)
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


PAGE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Collage A/B</title>
<style>
  :root { --bg: #141414; --panel: #1f1f1f; --fg: #eee; --muted: #999; --pick: #3fb950; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.4 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 1; background: var(--bg); padding: 12px 16px; border-bottom: 1px solid #333; }
  header h1 { margin: 0 0 4px; font-size: 18px; }
  header h1 small { color: var(--muted); font-weight: normal; font-size: 14px; }
  header p { margin: 0; color: var(--muted); font-size: 13px; }
  main { padding: 8px 16px 40px; max-width: 980px; margin: 0 auto; }
  .pair { background: var(--panel); border-radius: 8px; padding: 12px; margin: 12px 0; }
  .pair h2 { margin: 0 0 10px; font-size: 16px; }
  .pair h2 small { color: var(--muted); font-weight: normal; }
  .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .side { padding: 0; border: 3px solid transparent; border-radius: 6px; background: none; cursor: pointer; }
  .side img { display: block; width: 100%; border-radius: 3px; }
  .side[aria-pressed=true] { border-color: var(--pick); }
  .side:focus-visible { border-color: #fff; }
  .other { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .other button { font: inherit; padding: 4px 12px; border-radius: 4px; border: 1px solid #555; background: none; color: var(--fg); cursor: pointer; }
  .other button[aria-pressed=true] { background: var(--fg); color: #000; }
</style></head><body>
<header><h1>Which collage is better? <small id="progress"></small></h1>
<p>Same film, same keyword, two detectors in random order. Click the better collage, or one of the buttons below it. Saved as you click.</p></header>
<main id="pairs"></main>
<script>
const DATA = __DATA__;
let picks = {};
const save = () => fetch("/picks", { method: "POST", body: JSON.stringify(picks) });
const progress = () => { document.getElementById("progress").textContent = `${DATA.filter(p => picks[p.id]).length} of ${DATA.length} done`; };
function render() {
  const main = document.getElementById("pairs");
  DATA.forEach((p, i) => {
    const el = document.createElement("section");
    el.className = "pair";
    el.innerHTML = `<h2>${i + 1}. ${p.label} <small>${p.film}</small></h2>
      <div class="sides">
        <button class="side" data-v="left"><img src="${p.left}" alt="Collage A for ${p.label}"></button>
        <button class="side" data-v="right"><img src="${p.right}" alt="Collage B for ${p.label}"></button>
      </div>
      <div class="other"><button data-v="both">Both fine</button><button data-v="neither">Neither is usable</button></div>`;
    const buttons = el.querySelectorAll("[data-v]");
    const show = () => buttons.forEach(b => b.setAttribute("aria-pressed", picks[p.id] === b.dataset.v));
    buttons.forEach(b => b.onclick = () => { picks[p.id] = b.dataset.v; show(); save(); progress(); });
    show();
    main.append(el);
  });
  progress();
}
fetch("/picks").then(r => r.json()).then(j => { picks = j; render(); });
</script></body></html>
"""

if __name__ == "__main__":
    if sys.argv[1:] == ["score"]:
        score()
    else:
        build(*(sys.argv[1:3] or ["sam3", "mmdino"]))
        http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
