"""Flag near-duplicate frames and non-stills (posters, fan art, renders) among a film's backdrops.

Duplicates: dHash in fetch.py only catches byte-level copies. Here CLIP similarity proposes candidate
pairs and SIFT keypoints with a RANSAC homography confirm them, which matches the same frame re-cropped,
re-graded or upscaled but not a different shot of the same scene (CLIP alone cannot tell those apart).
Non-stills: CLIP zero-shot labels catch posters, painted key art, renders and drawings.

usage: python frames.py <slug>
writes detections/<slug>-frames.json and a review sheet frames-<slug>.jpg
"""
import json, sys, pathlib, cv2, numpy as np, torch
from PIL import Image, ImageDraw, ImageFont
from transformers import CLIPModel, CLIPProcessor

LAB = pathlib.Path(__file__).parent
MODEL = "openai/clip-vit-large-patch14"
CANDIDATE_SIM = 0.85  # CLIP cosine similarity above which a pair is checked with SIFT
MIN_INLIERS = 30  # RANSAC homography inliers that confirm two frames show the same shot
STILL_PROMPTS = [
    "a still frame from a movie", "a cinematic film still", "a screenshot from a film",
    "a photo of actors in a scene", "a black and white film still",
]
ART_PROMPTS = [
    "a movie poster", "painted movie poster artwork", "an airbrushed illustration", "a collage of actors on a poster",
    "fan art", "a digital illustration", "a 3D render", "a pencil drawing", "concept art",
]
BTS_PROMPTS = ["a behind the scenes photo of a film crew with a camera"]
NOT_STILL = 0.45  # share of probability on ART_PROMPTS + BTS_PROMPTS above which a frame is flagged
PROMPTS = STILL_PROMPTS + ART_PROMPTS + BTS_PROMPTS

slug = sys.argv[1]
device = "cuda" if torch.cuda.is_available() else "cpu"
model = CLIPModel.from_pretrained(MODEL, dtype=torch.float16 if device == "cuda" else torch.float32).to(device).eval()
proc = CLIPProcessor.from_pretrained(MODEL)
index = json.loads((LAB / "images" / slug / "index.json").read_text())
files = [it["file"] for it in index]

with torch.no_grad():
    t = proc(text=PROMPTS, return_tensors="pt", padding=True).to(device)
    text = torch.nn.functional.normalize(model.get_text_features(**t).pooler_output, dim=-1)
    embs = []
    for i in range(0, len(files), 32):
        imgs = [Image.open(LAB / "images" / slug / f).convert("RGB") for f in files[i:i + 32]]
        px = proc(images=imgs, return_tensors="pt")["pixel_values"].to(device, model.dtype)
        embs.append(torch.nn.functional.normalize(model.get_image_features(pixel_values=px).pooler_output, dim=-1))
    emb = torch.cat(embs)
    probs = (model.logit_scale.exp() * emb @ text.T).float().softmax(-1).cpu().numpy()
    sim = (emb @ emb.T).float().cpu().numpy()
not_still = probs[:, len(STILL_PROMPTS):].sum(-1)

sift = cv2.SIFT_create(nfeatures=2000)
matcher = cv2.BFMatcher()
_kp = {}


def keypoints(f):
    if f not in _kp:
        g = cv2.imread(str(LAB / "images" / slug / f), cv2.IMREAD_GRAYSCALE)
        g = cv2.resize(g, (640, round(g.shape[0] * 640 / g.shape[1])))
        _kp[f] = sift.detectAndCompute(g, None)
    return _kp[f]


def inliers(a, b):
    (ka, da), (kb, db) = keypoints(a), keypoints(b)
    if da is None or db is None or len(ka) < 8 or len(kb) < 8:
        return 0
    good = [m for m, n in (p for p in matcher.knnMatch(da, db, k=2) if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 8:
        return 0
    src = np.float32([ka[m.queryIdx].pt for m in good])
    dst = np.float32([kb[m.trainIdx].pt for m in good])
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    return int(mask.sum()) if mask is not None else 0


result, pairs = {}, []
for i, f in enumerate(files):
    # Greedy clustering in index order: a frame joins the first earlier kept frame it matches.
    dup_of = None
    for j in range(i):
        if result[files[j]]["dup_of"] is None and sim[i, j] >= CANDIDATE_SIM:
            n = inliers(files[j], f)
            pairs.append((files[j], f, float(sim[i, j]), n))
            if n >= MIN_INLIERS:
                dup_of = files[j]
                break
    top = int(probs[i, len(STILL_PROMPTS):].argmax()) + len(STILL_PROMPTS)
    result[f] = {
        "dup_of": dup_of,
        "not_still": round(float(not_still[i]), 3),
        "flag": PROMPTS[top] if not_still[i] >= NOT_STILL else None,
    }

out = LAB / "detections" / f"{slug}-frames.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(result, indent=1))
dups = [p for p in pairs if p[3] >= MIN_INLIERS]
flagged = [f for f, r in result.items() if r["flag"]]
print(f"{slug}: {len(files)} frames, {len(dups)} near-duplicates, {len(flagged)} flagged as not a still")

# Review sheet, three pairs or six frames per row: confirmed duplicates, then the closest rejected
# candidates, then flagged frames, then the most art-like frames just under the threshold.
font = ImageFont.load_default(size=15)
w, h, gap, cols = 300, 169, 6, 6
cells = []  # (file, caption) laid out left to right
for kind, ps in (("DUP", dups), ("not dup", sorted((p for p in pairs if p[3] < MIN_INLIERS), key=lambda p: -p[3])[:12])):
    for a, b, s, n in ps:
        cells += [(a, f"{kind} {a}"), (b, f"{b} clip {s:.2f} sift {n}")]
if len(cells) % cols:
    cells += [(None, "")] * (cols - len(cells) % cols)
for f in flagged:
    cells.append((f, f"FLAG {f} {result[f]['not_still']:.2f} {result[f]['flag'][:22]}"))
if len(cells) % cols:
    cells += [(None, "")] * (cols - len(cells) % cols)
for s, f in sorted(((r["not_still"], f) for f, r in result.items() if not r["flag"]), reverse=True)[:12]:
    cells.append((f, f"near {f} {s:.2f}"))
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + gap), max(1, rows) * (h + 22 + gap)), (20, 20, 20))
draw = ImageDraw.Draw(sheet)
for k, (f, caption) in enumerate(cells):
    x, y = (k % cols) * (w + gap), (k // cols) * (h + 22 + gap)
    if f:
        im = Image.open(LAB / "images" / slug / f).convert("RGB")
        im.thumbnail((w, h))
        sheet.paste(im, (x, y))
    draw.text((x + 2, y + h + 3), caption, fill="white", font=font)
sheet.save(LAB / f"frames-{slug}.jpg", quality=85)
print(f"  -> frames-{slug}.jpg")
