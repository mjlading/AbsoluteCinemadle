"""Curate a batch of daily Close-Ups puzzles by hand, in the browser.

Shows every film of a batch (images/<prefix>-picks.json from pick_demo.py) with all keyword rows
from its SAM 3 and MM-DINO reports and every tile in them, not just the first six.
For each film: pick 5 keywords, choose exactly which 4 tiles make each collage, set the label,
tier and free starter, check a tile against its full frame, and give the day its date.
Saves to images/<slug>-curation.json as you go; a draft already there (from a curation agent)
is the starting point. Mark a day "approved" when it is done; export_demo.py warns about the rest.

usage: python curate.py <prefix> [first date YYYY-MM-DD]   # serves http://localhost:8767
then:  python export_demo.py images/<prefix>-*-curation.json
"""
import io, json, sys, pathlib, datetime, http.server, urllib.parse
from PIL import Image
import lookalike

LAB = pathlib.Path(__file__).parent
PREFIX = sys.argv[1]
FIRST = datetime.date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else None
MODELS = ("sam3", "mmdino")
PORT, TILE, FRAME = 8767, 200, 1400
TIERS = {"hard": 0, "medium": 1, "easy": 2}


def curation_path(slug):
    return LAB / "images" / f"{slug}-curation.json"


def load_day(n, slug):
    meta = json.loads((LAB / "images" / slug / "meta.json").read_text())
    size = {it["file"]: (it["w"], it["h"]) for it in json.loads((LAB / "images" / slug / "index.json").read_text())}
    rows = []
    for model in MODELS:
        path = LAB / "detections" / f"{slug}-{model}-keywords.json"
        if not path.exists():
            continue
        for row, hits in json.loads(path.read_text()).items():
            like = lookalike.similar(slug, hits)
            rows.append({"id": f"{model}:{row}", "model": model, "row": row, "default": lookalike.diverse(list(hits), like), "frames": [
                {"file": f, "score": round(d["score"], 2), "crop": [round(v) for v in d["crop"]], "w": size[f][0],
                 "face": bool(d["face"]), "text": d["text"] or "", "like": like.get(f, [])}
                for f, d in hits.items()]})
    saved = json.loads(curation_path(slug).read_text(encoding="utf-8-sig")).get(slug) if curation_path(slug).exists() else None
    date = (saved or {}).get("date") or (str(FIRST + datetime.timedelta(days=n)) if FIRST else "")
    return {"slug": slug, "title": meta["title"], "date": date, "rows": rows, "saved": saved}


def days():
    picks = json.loads((LAB / "images" / f"{PREFIX}-picks.json").read_text())
    return [load_day(n, p["slug"]) for n, p in enumerate(picks) if (LAB / "images" / p["slug"] / "meta.json").exists()]


def image_bytes(slug, file, box, size):
    img = Image.open(LAB / "images" / slug / file)
    w, h = img.size
    if box:
        x0, y0, x1, y1 = box
        img.draft("RGB", (max(1, int(w * size / (x1 - x0))), max(1, int(h * size / (y1 - y0)))))
        s = img.size[0] / w
        img = img.convert("RGB").crop([round(v * s) for v in box]).resize((size, size), Image.LANCZOS)
    else:
        img.draft("RGB", (size, size * h // w))
        img = img.convert("RGB")
        img.thumbnail((size, size * h // w), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=86)
    return buf.getvalue()


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, kind):
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        if kind == "image/jpeg":
            self.send_header("Cache-Control", "max-age=86400")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(p) for p in url.path.strip("/").split("/")]
        q = urllib.parse.parse_qs(url.query)
        try:
            if url.path == "/":
                html = PAGE.replace("__DATA__", json.dumps({"days": days(), "tiers": list(TIERS)}).replace("</", "<\\/"))
                return self.send(200, html.encode(), "text/html; charset=utf-8")
            if parts[0] == "tile":
                box = [float(v) for v in q["c"][0].split(",")]
                return self.send(200, image_bytes(parts[1], parts[2], box, TILE), "image/jpeg")
            if parts[0] == "frame":
                return self.send(200, image_bytes(parts[1], parts[2], None, FRAME), "image/jpeg")
        except (KeyError, FileNotFoundError, ValueError) as e:
            return self.send(404, str(e).encode(), "text/plain")
        self.send(404, b"not found", "text/plain")

    def do_POST(self):
        parts = self.path.strip("/").split("/")
        if parts[0] != "save" or len(parts) != 2:
            return self.send(404, b"not found", "text/plain")
        slug = parts[1]
        entry = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        path = curation_path(slug)
        doc = json.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else {}
        doc[slug] = entry
        path.write_text(json.dumps(doc, indent=1), encoding="utf-8")
        self.send(200, b"saved", "text/plain")


PAGE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Close-Ups curation</title>
<style>
:root { color-scheme: dark; --bg: #121212; --panel: #1d1d1d; --line: #333; --text: #eee; --dim: #999;
  --gold: #e8b931; --red: #ff4d4d; --orange: #ffa000; --green: #3ecf6e; --blue: #5aa0ff; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.4 system-ui, sans-serif; background: var(--bg); color: var(--text); }
header { position: sticky; top: 0; z-index: 5; background: #0b0b0b; border-bottom: 1px solid var(--line); padding: 10px 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
header button { background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; cursor: pointer; font: inherit; }
header button[aria-current="true"] { border-color: var(--gold); color: var(--gold); }
header button .ok { color: var(--green); }
main { padding: 16px; max-width: 1500px; margin: 0 auto; }
h1 { font-size: 20px; margin: 0 0 4px; }
.sub { color: var(--dim); margin-bottom: 14px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
.sub label { display: inline-flex; gap: 6px; align-items: center; }
input, select { background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 5px; padding: 4px 6px; font: inherit; }
.status { font-weight: 600; }
.status.bad { color: var(--orange); } .status.good { color: var(--green); }
section.puzzle { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 20px; }
.keys { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
.key { flex: 0 0 auto; width: 236px; background: #0e0e0e; border-radius: 8px; padding: 8px; border: 1px solid var(--line); }
.key.dropped { opacity: .45; }
.key .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 220px; height: 220px; background: #000; }
.key .grid img, .key .grid span { width: 109px; height: 109px; display: block; }
.key .grid span { background: repeating-linear-gradient(45deg, #222 0 6px, #2a2a2a 6px 12px); }
.key .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 4px; }
.key .head b { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.key .meta { color: var(--dim); font-size: 12px; margin-top: 6px; display: flex; justify-content: space-between; }
.key button { background: none; border: 1px solid var(--line); color: var(--text); border-radius: 4px; cursor: pointer; padding: 0 6px; }
.free { color: var(--gold); }
.row { border-top: 1px solid var(--line); padding: 12px 0; scroll-margin-top: 64px; }
.row.used { background: linear-gradient(90deg, rgba(232,185,49,.08), transparent 40%); }
.row .ctl { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.row .ctl .name { font-weight: 600; min-width: 150px; }
.row .ctl .model { font-size: 11px; color: var(--dim); border: 1px solid var(--line); border-radius: 10px; padding: 0 6px; }
.row .warn { color: var(--orange); font-size: 12px; }
.tiles { display: flex; flex-wrap: wrap; gap: 6px; }
.tile { position: relative; width: 120px; height: 120px; padding: 0; border: 3px solid transparent; border-radius: 4px; background: #000; cursor: pointer; }
.tile img { width: 100%; height: 100%; display: block; }
.tile[aria-pressed="true"] { border-color: var(--gold); }
.tile .n { position: absolute; top: 3px; left: 3px; background: var(--gold); color: #000; font-weight: 700; border-radius: 50%; width: 22px; height: 22px; line-height: 22px; text-align: center; font-size: 12px; }
.tile .cap { position: absolute; bottom: 0; left: 0; right: 0; font-size: 11px; background: rgba(0,0,0,.65); color: #ddd; padding: 1px 4px; display: flex; justify-content: space-between; }
.tile .flag { position: absolute; top: 3px; right: 3px; font-size: 10px; font-weight: 700; padding: 0 4px; border-radius: 3px; }
.tile .flag.face { background: var(--red); color: #fff; } .tile .flag.text { background: var(--orange); color: #000; top: 20px; }
.tile .flag.like { background: #444; color: #fff; top: auto; bottom: 20px; left: 3px; right: auto; max-width: 84px; overflow: hidden; white-space: nowrap; }
.tile .flag.like.clash { background: var(--red); }
.tile .zoom { position: absolute; bottom: 18px; right: 3px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,.7); color: #fff; border: 1px solid #666; font-size: 13px; line-height: 20px; text-align: center; }
.tile:focus-visible, button:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
dialog { background: #000; border: 1px solid var(--line); padding: 8px; max-width: 96vw; max-height: 96vh; color: var(--text); }
dialog::backdrop { background: rgba(0,0,0,.8); }
.framewrap { position: relative; display: inline-block; }
.framewrap img { max-width: 92vw; max-height: 86vh; display: block; }
.framewrap .box { position: absolute; border: 3px solid var(--gold); box-shadow: 0 0 0 9999px rgba(0,0,0,.35); }
.hint { color: var(--dim); font-size: 12px; }
.saved { color: var(--dim); font-size: 12px; min-width: 60px; }
</style></head><body>
<header id="tabs"></header>
<main id="main"></main>
<dialog id="frame"><div class="framewrap"><img alt=""><div class="box"></div></div><p class="hint" id="framecap"></p></dialog>
<script>
const DATA = __DATA__;
const TIERS = DATA.tiers, KEEP = 5, TILES = 4;
const days = DATA.days.map(initDay);
let current = Math.max(0, days.findIndex(d => !d.approved));
const $ = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v); } e.append(...kids.flat().filter(k => k != null)); return e; };

function prettyLabel(row) { const s = row.replace(/^\[|\]$/g, ""); const p = /s$|hair$|food$|money$|sheet music$/.test(s) ? s : s.endsWith("ch") || s.endsWith("sh") || s.endsWith("x") ? s + "es" : s + "s"; return p.replace(/\b\w/g, c => c.toUpperCase()); }

function initDay(d) {
  const rows = Object.fromEntries(d.rows.map(r => [r.id, r]));
  const keys = [];
  for (const k of d.saved?.keywords || []) {
    const id = `${k.source}:${k.row}`, r = rows[id];
    if (!r) continue;
    const skip = new Set(k.skip || []);
    const frames = k.frames || r.frames.map(f => f.file).filter(f => !skip.has(f)).slice(0, TILES);
    keys.push({ id, label: k.label, tier: k.tier, free: !!k.free, frames });
  }
  return { slug: d.slug, title: d.title, date: d.date, rows, rowList: d.rows, keys, approved: !!d.saved?.approved, savedAt: d.saved ? "draft loaded" : "" };
}

function ordered(day) {
  const ks = day.keys.slice();
  return ks.filter(k => k.free).concat(TIERS.flatMap(t => ks.filter(k => !k.free && k.tier === t)));
}

function problems(day) {
  const p = [];
  if (day.keys.length < KEEP) p.push(`${KEEP - day.keys.length} more keyword(s) needed`);
  if (day.keys.length > KEEP) p.push(`${day.keys.length - KEEP} past the fifth will be dropped`);
  const free = day.keys.filter(k => k.free).length;
  if (free !== 1) p.push(free ? "only one free keyword" : "no free keyword");
  for (const k of day.keys) if (k.frames.length !== TILES) p.push(`${k.label}: ${k.frames.length}/4 tiles`);
  for (const k of day.keys) { const like = Object.fromEntries(day.rows[k.id].frames.map(f => [f.file, f.like])); if (k.frames.some(a => k.frames.some(b => like[a].includes(b)))) p.push(`${k.label}: possible same shot (≈)`); }
  if (!/^\d{4}-\d\d-\d\d$/.test(day.date)) p.push("no date");
  const dates = days.filter(d => d.date && d.date === day.date);
  if (dates.length > 1) p.push("date used twice");
  return p;
}

let saveTimer;
function save(day) {
  clearTimeout(saveTimer);
  day.savedAt = "saving…";
  saveTimer = setTimeout(async () => {
    const entry = { name: day.slug, date: day.date || undefined, approved: day.approved || undefined,
      keywords: day.keys.map(k => { const [source, ...row] = k.id.split(":"); return { label: k.label, tier: k.tier, ...(k.free ? { free: true } : {}), source, row: row.join(":"), frames: k.frames }; }) };
    const r = await fetch(`/save/${day.slug}`, { method: "POST", body: JSON.stringify(entry) });
    day.savedAt = r.ok ? "saved " + new Date().toLocaleTimeString() : "SAVE FAILED";
    document.querySelectorAll(".saved").forEach(e => e.textContent = day.savedAt);
  }, 300);
  render();
}

function tileImg(day, row, file) {
  const f = row.frames.find(x => x.file === file);
  return $("img", { src: `/tile/${day.slug}/${file}?c=${f.crop.join(",")}`, alt: `${file}`, loading: "lazy", width: 109, height: 109 });
}

function openFrame(day, row, f) {
  const dlg = document.getElementById("frame"), img = dlg.querySelector("img"), box = dlg.querySelector(".box");
  box.style.display = "none";
  img.onload = () => {
    // Crops are in the original frame's pixels; the frame is served smaller, so scale by its shown width.
    const k = img.clientWidth / f.w;
    const [x0, y0, x1, y1] = f.crop;
    Object.assign(box.style, { display: "block", left: x0 * k + "px", top: y0 * k + "px", width: (x1 - x0) * k + "px", height: (y1 - y0) * k + "px" });
  };
  img.src = `/frame/${day.slug}/${f.file}`;
  document.getElementById("framecap").textContent = `${f.file} · ${row.row} (${row.model}) · score ${f.score}${f.text ? " · text: " + f.text : ""}${f.face ? " · face flagged" : ""} — Esc to close`;
  dlg.showModal();
}

function render() {
  const tabs = document.getElementById("tabs");
  tabs.replaceChildren(...days.map((d, i) => $("button", { "aria-current": i === current ? "true" : "false", onclick: () => { current = i; render(); scrollTo(0, 0); } },
    `${d.date || "no date"} `, d.approved ? $("span", { class: "ok" }, "✓") : problems(d).length ? "•" : "")),
    $("span", { class: "hint" }, "Click a tile to add it to or remove it from the collage (order = click order). 🔍 shows the full frame."));
  const day = days[current];
  if (!day) { document.getElementById("main").textContent = "No films in this batch yet."; return; }
  const probs = problems(day);
  const used = new Map(day.keys.map(k => [k.id, k]));
  const main = document.getElementById("main");
  main.replaceChildren(
    $("h1", {}, day.title, " ", $("span", { class: "hint" }, day.slug)),
    $("div", { class: "sub" },
      $("label", {}, "Date ", $("input", { type: "date", value: day.date, onchange: e => { day.date = e.target.value; save(day); } })),
      $("label", {}, $("input", { type: "checkbox", checked: day.approved, disabled: probs.length > 0 && !day.approved, onchange: e => { day.approved = e.target.checked; save(day); } }), " Approved"),
      $("span", { class: "status " + (probs.length ? "bad" : "good") }, probs.length ? probs.join(" · ") : "Ready"),
      $("span", { class: "saved" }, day.savedAt)),
    $("section", { class: "puzzle", "aria-label": "Puzzle in play order" },
      $("div", { class: "hint", style: "margin-bottom:8px" }, "Play order (free first, then hard, medium, easy; ◀ ▶ reorders within a tier)"),
      $("div", { class: "keys" }, ordered(day).map((k, i) => keyCard(day, k, i)))),
    ...day.rowList.map(r => rowEl(day, r, used.get(r.id))));
}

function keyCard(day, k, i) {
  const row = day.rows[k.id];
  const cells = Array.from({ length: TILES }, (_, n) => k.frames[n] ? tileImg(day, row, k.frames[n]) : $("span"));
  const move = dir => { const same = day.keys.filter(x => x.free === k.free && x.tier === k.tier); const j = same.indexOf(k) + dir; if (j < 0 || j >= same.length) return; const a = day.keys.indexOf(k), b = day.keys.indexOf(same[j]); [day.keys[a], day.keys[b]] = [day.keys[b], day.keys[a]]; save(day); };
  return $("div", { class: "key" + (i >= KEEP ? " dropped" : "") },
    $("div", { class: "head" }, $("b", {}, `${i + 1}. ${k.label}`), $("span", {}, $("button", { title: "Earlier", "aria-label": "Move earlier", onclick: () => move(-1) }, "◀"), " ", $("button", { title: "Later", "aria-label": "Move later", onclick: () => move(1) }, "▶"))),
    $("div", { class: "grid" }, cells),
    $("div", { class: "meta" }, $("span", { class: k.free ? "free" : "" }, k.free ? "free · " + k.tier : k.tier), $("span", {}, `${row.row} · ${row.model}`)));
}

function rowEl(day, r, k) {
  const toggleUse = e => {
    if (e.target.checked) day.keys.push({ id: r.id, label: prettyLabel(r.row), tier: "medium", free: false, frames: r.default.slice() });
    else day.keys = day.keys.filter(x => x.id !== r.id);
    save(day);
  };
  const ctl = $("div", { class: "ctl" },
    $("label", {}, $("input", { type: "checkbox", checked: !!k, onchange: toggleUse }), " ", $("span", { class: "name" }, r.row)),
    $("span", { class: "model" }, r.model), $("span", { class: "hint" }, `${r.frames.length} frames`));
  if (k) ctl.append(
    $("label", {}, "Label ", $("input", { value: k.label, size: 14, onchange: e => { k.label = e.target.value.trim(); save(day); } })),
    $("label", {}, "Tier ", $("select", { onchange: e => { k.tier = e.target.value; save(day); } }, TIERS.map(t => $("option", { value: t, selected: t === k.tier }, t)))),
    $("label", {}, $("input", { type: "radio", name: "free-" + day.slug, checked: k.free, onchange: () => { day.keys.forEach(x => x.free = x === k); k.tier = "hard"; save(day); } }), " Free starter"),
    k.frames.length !== TILES ? $("span", { class: "warn" }, `${k.frames.length}/4 tiles picked`) : null);
  const tiles = $("div", { class: "tiles" }, r.frames.map(f => {
    const n = k ? k.frames.indexOf(f.file) : -1;
    const btn = $("button", { class: "tile", "aria-pressed": n >= 0 ? "true" : "false", "aria-label": `${r.row} ${f.file}${n >= 0 ? ", tile " + (n + 1) : ""}`, "aria-disabled": k ? false : "true",
      onclick: e => { if (e.target.closest(".zoom") || !k) return; if (n >= 0) k.frames.splice(n, 1); else if (k.frames.length < TILES) k.frames.push(f.file); else return; save(day); } },
      $("img", { src: `/tile/${day.slug}/${f.file}?c=${f.crop.join(",")}`, alt: "", loading: "lazy", width: 120, height: 120 }),
      n >= 0 ? $("span", { class: "n" }, n + 1) : null,
      f.face ? $("span", { class: "flag face" }, "FACE") : null,
      f.text ? $("span", { class: "flag text", title: f.text }, "TEXT") : null,
      f.like.length ? $("span", { class: "flag like" + (n >= 0 && f.like.some(o => k.frames.includes(o)) ? " clash" : ""), title: "Probably the same shot as " + f.like.join(", ") }, "≈" + f.like.map(o => o.replace(".jpg", "")).join(" ")) : null,
      $("span", { class: "zoom", role: "button", tabindex: 0, "aria-label": "Show full frame", onclick: () => openFrame(day, r, f), onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openFrame(day, r, f); } } }, "🔍"),
      $("span", { class: "cap" }, $("span", {}, f.file.replace(".jpg", "")), $("span", {}, f.score)));
    btn.style.cursor = k ? "pointer" : "default";
    return btn;
  }));
  return $("div", { class: "row" + (k ? " used" : "") }, ctl, tiles);
}

document.getElementById("frame").addEventListener("click", e => { if (e.target.id === "frame") e.target.close(); });
render();
</script></body></html>"""

if __name__ == "__main__":
    print(f"http://localhost:{PORT}  ({len(days())} films in {PREFIX})")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
