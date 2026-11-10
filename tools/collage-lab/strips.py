"""Images a curation agent can read at full detail: one strip per keyword row, and full frames.

Contact sheets from report.py hold a whole film and get shrunk when a model views them, which hides
near-duplicates and mislabelled tiles. A strip holds one row (SAM 3 or MM-DINO) at 240 px per tile,
every tile numbered by its frame file, "~015" on tiles that probably come from the same shot as
frame 015 (lookalike.py); a frame shows where a tile was cut from.

usage: python strips.py <slug>                          # agent/<slug>/<model>--<row>.jpg for every row
       python strips.py <slug> frame <model> <row> <file>  # agent/<slug>/frame-<file> with the crop boxed
"""
import json, re, sys, pathlib
from PIL import Image, ImageDraw, ImageFont
import lookalike

LAB = pathlib.Path(__file__).parent
TILE, PER_LINE, GAP = 240, 6, 6
slug = sys.argv[1]
out = LAB / "agent" / slug
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default(size=20)


def rows(model):
    path = LAB / "detections" / f"{slug}-{model}-keywords.json"
    return json.loads(path.read_text()) if path.exists() else {}


def safe(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


if len(sys.argv) > 2 and sys.argv[2] == "frame":
    model, row, file = sys.argv[3:6]
    d = rows(model)[row][file]
    img = Image.open(LAB / "images" / slug / file).convert("RGB")
    ImageDraw.Draw(img).rectangle(d["crop"], outline=(255, 200, 0), width=max(4, img.width // 300))
    img.thumbnail((1600, 1600))
    img.save(out / f"frame-{file}", quality=85)
    print(out / f"frame-{file}")
    sys.exit()

for model in ("sam3", "mmdino"):
    for row, hits in rows(model).items():
        items = list(hits.items())
        like = lookalike.similar(slug, hits)
        lines = (len(items) + PER_LINE - 1) // PER_LINE
        sheet = Image.new("RGB", (PER_LINE * (TILE + GAP), lines * (TILE + GAP)), (20, 20, 20))
        draw = ImageDraw.Draw(sheet)
        for i, (file, d) in enumerate(items):
            x, y = (i % PER_LINE) * (TILE + GAP), (i // PER_LINE) * (TILE + GAP)
            sheet.paste(Image.open(LAB / "images" / slug / file).convert("RGB").crop(d["crop"]).resize((TILE, TILE), Image.LANCZOS), (x, y))
            tag = file[:-4] + (" FACE" if d["face"] else "") + (" TEXT" if d["text"] else "") + "".join(f" ~{o[:-4]}" for o in like.get(file, []))
            draw.rectangle([x, y, x + 12 * len(tag) + 8, y + 26], fill=(0, 0, 0))
            draw.text((x + 4, y + 2), tag, fill=(255, 80, 80) if d["face"] else (255, 220, 0), font=font)
        sheet.save(out / f"{model}--{safe(row)}.jpg", quality=85)
print(f"strips for {slug} -> {out}")
