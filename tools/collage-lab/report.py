"""Turn raw detections into candidate keyword collages and a contact sheet per film and model.

Needs detect.py output, plus faces.py and frames.py output for the same film.

usage: python report.py <slug> <model>
"""
import collections, json, re, sys, pathlib
from PIL import Image, ImageDraw, ImageFont
import crops as crop_checks
import blur

LAB = pathlib.Path(__file__).parent
slug, model = sys.argv[1], sys.argv[2]
MIN_SCORE = {"dino": 0.35, "mmdino": 0.35, "llmdet": 0.35, "owl": 0.3, "sam3": 0.5}.get(model, 0.0)
# Per-label overrides for labels a model over-fires on (higher) or is shy about (lower).
LABEL_SCORE = {
    "owl": {"piano": 0.45, "painting": 0.5, "window": 0.4, "door": 0.4},
}.get(model, {})
MIN_REL_SIDE = 0.05  # object's short side as a share of frame width (48 px where the detector looks)
MIN_CROP_PX = 160  # native pixels per tile side; less is visibly upscaled on a 200 px tile
MAX_AREA = 0.4  # of the frame
FACE_SCORE = 0.7  # YuNet; below this its hits are mostly drums, fists and patterns
# A whole face covering 1% of the crop is about 20 px on a 200 px tile, which is already enough to
# recognise a lead actor (Fletcher behind a cymbal, Marty in his vest); 0.3% is marked for a human.
FACE_DROP = 0.01
FACE_FLAG = 0.003
# These keywords show part of a face by design, so a partly visible face is fine; a whole face in the
# crop still drops it. "hair" is not one of them: its boxes cover the whole head.
FACE_PARTS = {"mouth", "eye", "ear"}
WHOLE_FACE = 0.8  # share of a face box inside the crop that counts as the whole face
PART_FACE = 0.2  # for other keywords, a fifth of a face (eyes under a hat brim, a chin) already counts
HEAD_P = 0.5  # VLM probability that part of a head shows; matched the owner's spoiler marks on Pulp Fiction ties
MIN_SHARP = 1.3  # blur.sharpness at tile size; calibrated by eye on blur-*.jpg, below it tiles look blurry
MIN_SHARP_SKIN = 1.0  # eye, ear and mouth: in-focus skin has few crisp edges, so it scores lower
MIN_BRIGHT = 60  # 95th-percentile luminance (0-255) under which a crop is too dark to read on a tile
DIVERSE_SIM = 0.95  # CLIP similarity at or above which two crops look the same (same pose, next frame)
SAME_SHOT = 0.86  # DINOv2 crop similarity at or above which two crops are one shot (Parasite peach 0.877, Amelie skull 0.868); distinct shots of one drum kit can reach it too
MIN_IMAGES = 4
# Display groups: several detector labels under one keyword, for labels too rare on their own.
GROUPS = {
    "footwear": ["shoe", "boot"], "eyewear": ["glasses", "sunglasses"],
    "instruments": ["guitar", "drum", "cymbal", "piano", "trumpet", "microphone"],
    "vehicles": ["car", "truck", "motorcycle", "bicycle"], "weapons": ["gun", "knife", "sword"],
    "phones": ["telephone", "mobile phone"], "screens": ["television", "computer"],
    "jewelry": ["ring", "necklace", "earring", "wristwatch"], "neckwear": ["necktie", "bow tie"],
    "luggage": ["handbag", "suitcase"], "animals": ["dog", "cat", "horse", "bird"],
    "drinks": ["cup", "wine glass", "bottle"], "lights": ["lamp", "candle"],
    "paper": ["book", "newspaper", "envelope", "sheet music"],
}
PADS = (0.15, 0.08, 0.0)  # context around the object, widest first; tighter only to avoid a face
TILE, SHOWN = 200, 6  # the first 4 tiles make the collage; the rest show the spare pool


def area(b):
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def inter(a, b):
    return [max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])]


def axis_positions(lo, hi, side, limit, steps=7):
    """Window starts along one axis that keep [lo, hi] inside, centred first."""
    first, last = max(0, hi - side), min(lo, limit - side)
    centre = min(max((lo + hi) / 2 - side / 2, 0), limit - side)
    if last <= first:
        return [centre]
    return [centre] + [first + (last - first) * i / (steps - 1) for i in range(steps)]


def candidate_crops(box, w, h):
    """Square crops that contain the object: centred with the widest padding first."""
    x0, y0, x1, y1 = box
    for pad in PADS:
        side = min(max(x1 - x0, y1 - y0) * (1 + 2 * pad), w, h)
        for left in axis_positions(x0, x1, side, w):
            for top in axis_positions(y0, y1, side, h):
                yield [left, top, left + side, top + side]


def place_crop(box, w, h, faces, min_inside):
    """The first candidate crop with no face in it, else the one with the least face in it."""
    best, best_share = None, 2.0
    for crop in candidate_crops(box, w, h):
        share = face_share(crop, faces, min_inside)
        if share < FACE_FLAG:
            return crop, share
        if share < best_share:
            best, best_share = crop, share
    return best, best_share


def face_share(crop, faces, min_inside):
    """Largest share of the crop covered by one face of which at least min_inside is in the crop."""
    best = 0.0
    for fb in faces:
        visible = area(inter(crop, fb))
        if visible >= min_inside * area(fb):
            best = max(best, visible / area(crop))
    return best


frames = json.loads((LAB / "detections" / f"{slug}-{model}.json").read_text())
faces_by_file = json.loads((LAB / "detections" / f"{slug}-faces.json").read_text())
frame_info = json.loads((LAB / "detections" / f"{slug}-frames.json").read_text())
by_label = {}
why = collections.defaultdict(collections.Counter)  # label -> rejection reasons, for keywords that fall short


def file_reason(reason):
    return reason
rejected = {"duplicate frame": 0, "not a still": 0, "small": 0, "large": 0, "face": 0, "low score": 0}
for f in frames:
    info = frame_info[f["file"]]
    if info["dup_of"] or info["flag"]:
        rejected["duplicate frame" if info["dup_of"] else "not a still"] += len(f["detections"])
        continue
    faces = [fc["box"] for fc in faces_by_file[f["file"]] if fc["score"] >= FACE_SCORE]
    # SAM 3's own "face" hits are reliable (0.8-0.95 on real faces), so they join YuNet's.
    if model == "sam3":
        faces += [d["box"] for d in f["detections"] if d["label"] == "face" and d["score"] >= 0.5]
    for d in f["detections"]:
        label = d["label"]
        if label == "face":
            continue
        if d["score"] < LABEL_SCORE.get(label, MIN_SCORE):
            rejected["low score"] += 1
            continue
        x0, y0, x1, y1 = d["box"]
        if min(x1 - x0, y1 - y0) < MIN_REL_SIDE * f["w"] or max(x1 - x0, y1 - y0) < MIN_CROP_PX:
            rejected["small"] += 1
            why[label][file_reason("small")] += 1
            continue
        if area(d["box"]) > MAX_AREA * f["w"] * f["h"]:
            rejected["large"] += 1
            why[label][file_reason("large")] += 1
            continue
        crop, share = place_crop(d["box"], f["w"], f["h"], faces, WHOLE_FACE if label in FACE_PARTS else PART_FACE)
        if share >= FACE_DROP:
            rejected["face"] += 1
            why[label][file_reason("face")] += 1
            continue
        best = by_label.setdefault(label, {})
        if f["file"] not in best or best[f["file"]]["score"] < d["score"]:
            best[f["file"]] = {**d, "crop": crop, "face": share >= FACE_FLAG}

# Text in a crop can name the film ("THE GRAND BUDAPEST HOTEL" on a book): crops with a word from the
# title are dropped, other readable text is marked for a human. Crops that look like one already picked
# for the same keyword are skipped, and only distinct crops count towards MIN_IMAGES.
meta = json.loads((LAB / "images" / slug / "meta.json").read_text())
# Names from the credits (director, main cast and their characters) spoil as much as the title does.
STOPWORDS = {"the", "and", "for", "von", "van", "der", "des", "les", "del", "mrs", "miss"}
WORD = r"[^\W\d_]+"  # letters in any script, so accented names stay one word
title_words = {w for w in re.findall(WORD, " ".join([meta["title"], *meta.get("names", [])]).lower()) if len(w) >= 3} - STOPWORDS
checks = crop_checks.analyse(slug, [(file, d["crop"]) for hits in by_label.values() for file, d in hits.items()])
rejected["title text"] = rejected["dark"] = rejected["blurry"] = rejected["head"] = 0


def frame_image(file, _last={}):
    """The frame as an image, keeping only the latest one: full-size frames are 25 MB each in memory."""
    if _last.get("file") != file:
        _last.update(file=file, img=Image.open(LAB / "images" / slug / file).convert("RGB"))
    return _last["img"]
for label, hits in by_label.items():
    for file in list(hits):
        c = checks[crop_checks.key(file, hits[file]["crop"])]
        words = set(re.findall(WORD, c["text"].lower()))
        if words & title_words:
            rejected["title text"] += 1
            why[label]["title text"] += 1
            del hits[file]
        elif c["head"] >= HEAD_P and label not in FACE_PARTS | {"hair"}:
            rejected["head"] += 1
            why[label]["head"] += 1
            del hits[file]
        elif c["bright"] < MIN_BRIGHT:
            rejected["dark"] += 1
            why[label]["dark"] += 1
            del hits[file]
        elif blur.sharpness(frame_image(file), hits[file]["box"], hits[file]["crop"]) < (MIN_SHARP_SKIN if label in FACE_PARTS else MIN_SHARP):
            rejected["blurry"] += 1
            why[label]["blurry"] += 1
            del hits[file]
        else:
            hits[file]["text"] = c["text"] if sum(ch.isalpha() for ch in c["text"]) >= 3 else ""
            hits[file]["emb"] = c["emb"]
            hits[file]["dino"] = c["dino"]


def distinct(hits):
    """Greedy by score: keep a crop only if it does not look like one already kept."""
    kept, skipped = {}, 0
    for file, d in sorted(hits.items(), key=lambda kv: -kv[1]["score"]):
        if any(float(d["emb"] @ k["emb"]) >= DIVERSE_SIM or float(d["dino"] @ k["dino"]) >= SAME_SHOT for k in kept.values()):
            skipped += 1
            continue
        kept[file] = d
    return kept, skipped


rejected["look-alike"] = 0
for label in list(by_label):
    by_label[label], skipped = distinct(by_label[label])
    rejected["look-alike"] += skipped

for group, members in GROUPS.items():
    merged = {}
    for m in members:
        for file, d in by_label.get(m, {}).items():
            if file not in merged or merged[file]["score"] < d["score"]:
                merged[file] = d
    # A group is only worth a row when it adds frames over its best single member.
    merged, _ = distinct(merged)
    if len(merged) > max((len(by_label.get(m, {})) for m in members), default=0):
        by_label[f"[{group}]"] = merged
keywords = sorted(((l, v) for l, v in by_label.items() if len(v) >= MIN_IMAGES), key=lambda kv: -len(kv[1]))
kept = sum(1 for r in frame_info.values() if not r["dup_of"] and not r["flag"])
print(f"{slug} / {model}: {kept} of {len(frames)} frames used, rejected detections {rejected}")
print("  keywords (>=4 frames): " + ", ".join(f"{l} {len(v)}" for l, v in keywords))
print("  too few frames: " + ", ".join(f"{l} {len(v)}" for l, v in sorted(by_label.items()) if len(v) < MIN_IMAGES and l[0] != "["))
for l, reasons in sorted(why.items()):
    if len(by_label.get(l, {})) < MIN_IMAGES and sum(reasons.values()) + len(by_label.get(l, {})) >= MIN_IMAGES:
        print(f"  {l}: {len(by_label.get(l, {}))} kept, lost to " + ", ".join(f"{r} {n}" for r, n in reasons.most_common()))
summary = LAB / "detections" / f"{slug}-{model}-keywords.json"
summary.write_text(json.dumps({l: {f: {k: d[k] for k in ("label", "score", "box", "crop", "face", "text")} for f, d in sorted(v.items(), key=lambda kv: -kv[1]["score"])} for l, v in keywords}, indent=1))

font = ImageFont.load_default(size=18)
small = ImageFont.load_default(size=14)
label_w, gap, sep = 170, 6, 14
sheet = Image.new("RGB", (label_w + SHOWN * (TILE + gap) + sep, max(1, len(keywords)) * (TILE + gap)), (20, 20, 20))
draw = ImageDraw.Draw(sheet)
for row, (label, hits) in enumerate(keywords):
    y = row * (TILE + gap)
    draw.text((8, y + 8), f"{label}\n{len(hits)} frames", fill="white", font=font)
    for col, (file, d) in enumerate(sorted(hits.items(), key=lambda kv: -kv[1]["score"])[:SHOWN]):
        x = label_w + col * (TILE + gap) + (sep if col >= 4 else 0)
        tile = Image.open(LAB / "images" / slug / file).crop(d["crop"]).resize((TILE, TILE), Image.LANCZOS)
        sheet.paste(tile, (x, y))
        if d["face"]:
            draw.rectangle([x, y, x + TILE - 1, y + TILE - 1], outline=(255, 60, 60), width=4)
        if d["text"]:
            draw.rectangle([x + 4, y + 4, x + TILE - 5, y + TILE - 5], outline=(255, 160, 0), width=3)
            draw.text((x + 8, y + 8), d["text"][:24], fill=(255, 160, 0), font=small)
        draw.text((x + 4, y + TILE - 20), f"{d['score']:.2f} {file[:3]} {d['label'] if label[0] == '[' else ''}", fill="yellow", font=small)
out = LAB / f"collages-{slug}-{model}.jpg"
sheet.save(out, quality=85)
print(f"  -> {out.name}")
