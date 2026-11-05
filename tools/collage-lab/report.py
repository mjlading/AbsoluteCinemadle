"""Turn raw detections into candidate keyword collages and a contact sheet per film and model.

usage: python report.py <slug> <dino|owl>
"""
import json, sys, pathlib
from PIL import Image, ImageDraw, ImageFont

LAB = pathlib.Path(__file__).parent
slug, model = sys.argv[1], sys.argv[2]
MIN_SCORE = {"dino": 0.35, "owl": 0.3}[model]
FACE_SCORE = {"dino": 0.3, "owl": 0.2}[model]
MIN_SIDE = 100  # px on a 1280-wide frame
MAX_AREA = 0.4  # of the frame
FACE_SHARE = 0.15  # of the crop covered by a face counts as a spoiler
FACE_PARTS = {"mouth", "eye", "ear", "hair", "face"}
MIN_IMAGES = 4
PAD = 0.15
TILE = 200


def area(b):
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def overlap(a, b):
    return area([max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])])


def square_crop(box, w, h):
    x0, y0, x1, y1 = box
    side = max(x1 - x0, y1 - y0) * (1 + 2 * PAD)
    side = min(side, w, h)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    left = min(max(cx - side / 2, 0), w - side)
    top = min(max(cy - side / 2, 0), h - side)
    return [left, top, left + side, top + side]


frames = json.loads((LAB / "detections" / f"{slug}-{model}.json").read_text())
by_label, rejected = {}, {"small": 0, "large": 0, "face": 0}
for f in frames:
    faces = [d["box"] for d in f["detections"] if d["label"] == "face" and d["score"] >= FACE_SCORE]
    for d in f["detections"]:
        if d["label"] == "face" or d["score"] < MIN_SCORE:
            continue
        x0, y0, x1, y1 = d["box"]
        if min(x1 - x0, y1 - y0) < MIN_SIDE:
            rejected["small"] += 1
            continue
        if area(d["box"]) > MAX_AREA * f["w"] * f["h"]:
            rejected["large"] += 1
            continue
        crop = square_crop(d["box"], f["w"], f["h"])
        if d["label"] not in FACE_PARTS and any(overlap(crop, fb) > FACE_SHARE * area(crop) for fb in faces):
            rejected["face"] += 1
            continue
        best = by_label.setdefault(d["label"], {})
        if f["file"] not in best or best[f["file"]]["score"] < d["score"]:
            best[f["file"]] = {**d, "crop": crop}

keywords = sorted(((l, v) for l, v in by_label.items() if len(v) >= MIN_IMAGES), key=lambda kv: -len(kv[1]))
print(f"{slug} / {model}: {len(frames)} frames, rejected {rejected}")
print("  keywords (>=4 frames): " + ", ".join(f"{l} {len(v)}" for l, v in keywords))
print("  too few frames: " + ", ".join(f"{l} {len(v)}" for l, v in sorted(by_label.items()) if len(v) < MIN_IMAGES))

font = ImageFont.load_default(size=18)
label_w, gap = 190, 6
sheet = Image.new("RGB", (label_w + 4 * (TILE + gap), max(1, len(keywords)) * (TILE + gap)), (20, 20, 20))
draw = ImageDraw.Draw(sheet)
for row, (label, hits) in enumerate(keywords):
    y = row * (TILE + gap)
    draw.text((8, y + 8), f"{label}\n{len(hits)} frames", fill="white", font=font)
    for col, (file, d) in enumerate(sorted(hits.items(), key=lambda kv: -kv[1]["score"])[:4]):
        tile = Image.open(LAB / "images" / slug / file).crop(d["crop"]).resize((TILE, TILE))
        sheet.paste(tile, (label_w + col * (TILE + gap), y))
        draw.text((label_w + col * (TILE + gap) + 4, y + TILE - 22), f"{d['score']:.2f}", fill="yellow", font=font)
out = LAB / f"collages-{slug}-{model}.jpg"
sheet.save(out, quality=85)
print(f"  -> {out.name}")
