"""Run an open-vocabulary detector over a film's backdrops and save raw detections.

usage: python detect.py <dino|owl> <slug> [limit]
"""
import truststore; truststore.inject_into_ssl()
import json, sys, time, pathlib, torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

LAB = pathlib.Path(__file__).parent
VOCAB = [
    "shoe", "boot", "hand", "hat", "glasses", "sunglasses", "wristwatch", "clock", "cup", "wine glass",
    "bottle", "car", "truck", "motorcycle", "bicycle", "gun", "knife", "sword", "telephone", "mobile phone",
    "television", "computer", "book", "newspaper", "lamp", "candle", "chair", "door", "window", "bed",
    "food", "cake", "cigarette", "guitar", "drum", "cymbal", "piano", "trumpet", "microphone", "ring",
    "necklace", "earring", "necktie", "bow tie", "handbag", "suitcase", "key", "money", "dog", "cat",
    "horse", "bird", "flower", "mirror", "painting", "sign", "umbrella", "helmet", "mask", "glove",
    "jacket", "mouth", "eye", "hair", "ear", "camera", "radio", "sheet music", "envelope", "box",
    "face",
]
MODELS = {"dino": "IDEA-Research/grounding-dino-base", "owl": "google/owlv2-base-patch16-ensemble"}
DETECT_WIDTH = 960

model_key, slug = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else None
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"device: {device}")
processor = AutoProcessor.from_pretrained(MODELS[model_key])
model = AutoModelForZeroShotObjectDetection.from_pretrained(MODELS[model_key]).to(device).eval()

index = json.loads((LAB / "images" / slug / "index.json").read_text())[:limit]
results, t0 = [], time.time()


def run_dino(img):
    # The whole vocabulary fits in one prompt (about 150 of Grounding DINO's 256 text tokens).
    inputs = processor(images=img, text=[VOCAB], return_tensors="pt").to(device)
    with torch.no_grad():
        out = model(**inputs)
    res = processor.post_process_grounded_object_detection(
        out, inputs.input_ids, threshold=0.3, text_threshold=0.25, target_sizes=[img.size[::-1]]
    )[0]
    found = []
    for box, score, label in zip(res["boxes"], res["scores"], res["text_labels"]):
        label = label.strip()
        # Grounding DINO can return merged or partial phrases; keep only exact vocabulary hits.
        if label in VOCAB:
            found.append({"label": label, "score": float(score), "box": [float(v) for v in box]})
    return found


def run_owl(img):
    inputs = processor(text=[[f"a photo of a {w}" for w in VOCAB]], images=img, return_tensors="pt").to(device)
    with torch.no_grad():
        out = model(**inputs)
    side = max(img.size)
    # OWLv2 pads to a square, so boxes are relative to the padded image.
    res = processor.post_process_grounded_object_detection(out, threshold=0.2, target_sizes=[(side, side)])[0]
    return [
        {"label": VOCAB[int(l)], "score": float(s), "box": [float(v) for v in b]}
        for b, s, l in zip(res["boxes"], res["scores"], res["labels"])
    ]


for n, item in enumerate(index):
    img = Image.open(LAB / "images" / slug / item["file"]).convert("RGB")
    scale = DETECT_WIDTH / img.width
    small = img.resize((DETECT_WIDTH, round(img.height * scale)))
    dets = run_dino(small) if model_key == "dino" else run_owl(small)
    for d in dets:
        d["box"] = [v / scale for v in d["box"]]
    results.append({"file": item["file"], "w": img.width, "h": img.height, "detections": dets})
    print(f"{n + 1}/{len(index)} {item['file']} {len(dets)} dets {time.time() - t0:.0f}s", flush=True)

out = LAB / "detections" / f"{slug}-{model_key}.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(results))
print(f"done in {time.time() - t0:.0f}s -> {out}")


