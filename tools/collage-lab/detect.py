"""Run an open-vocabulary detector over a film's backdrops and save raw detections.

usage: python detect.py <model> <slug> [limit]
models: owl, dino, mmdino, llmdet, florence, sam3, qwen (same vocabulary), qwen-open (names objects freely)
"""
import truststore; truststore.inject_into_ssl()
import json, re, sys, time, pathlib, torch
from PIL import Image
import transformers

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
MODELS = {
    "owl": "google/owlv2-base-patch16-ensemble",
    "dino": "IDEA-Research/grounding-dino-base",
    "mmdino": "openmmlab-community/mm_grounding_dino_large_all",
    "llmdet": "iSEE-Laboratory/llmdet_large",
    "florence": "florence-community/Florence-2-large",
    "sam3": "facebook/sam3",
    "qwen": "Qwen/Qwen3-VL-4B-Instruct",
    "qwen-open": "Qwen/Qwen3-VL-4B-Instruct",
}
# Grounding DINO-style models share one set of queries across every label in a prompt, so a long
# label list dilutes the scores; a few labels per prompt keeps them comparable to a single-label run.
CHUNK = 8
DETECT_WIDTH = 960

model_key, slug = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else None
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"device: {device}")
name = MODELS[model_key]
# AutoProcessor resolves facebook/sam3 to the video processor, which needs images with every text.
processor = (transformers.Sam3Processor if model_key == "sam3" else transformers.AutoProcessor).from_pretrained(name)
if model_key == "florence":
    model = transformers.Florence2ForConditionalGeneration.from_pretrained(name, dtype=torch.float16)
elif model_key == "sam3":
    model = transformers.Sam3Model.from_pretrained(name, dtype=torch.bfloat16)
elif model_key.startswith("qwen"):
    model = transformers.AutoModelForImageTextToText.from_pretrained(name, dtype=torch.bfloat16)
else:
    model = transformers.AutoModelForZeroShotObjectDetection.from_pretrained(name)
model = model.to(device).eval()
chunks = [VOCAB[i:i + CHUNK] for i in range(0, len(VOCAB), CHUNK)]


def run_grounding(img):
    found, res = [], []
    # Text and image are fused early, so each chunk reruns the backbone. The base model fits 3 copies
    # of the image in 16 GB; the large ones need about 8 GB for one.
    bs = 3 if model_key == "dino" else 1
    for i in range(0, len(chunks), bs):
        batch = chunks[i:i + bs]
        inputs = processor(images=[img] * len(batch), text=batch, return_tensors="pt", padding=True).to(device)
        with torch.autocast(device, dtype=torch.float16):
            out = model(**inputs)
        res += processor.post_process_grounded_object_detection(
            out, inputs.input_ids, threshold=0.25, text_threshold=0.25, target_sizes=[img.size[::-1]] * len(batch)
        )
    for labels, r in zip(chunks, res):
        for box, score, label in zip(r["boxes"], r["scores"], r["text_labels"]):
            label = label.strip()
            # Partial or merged phrases ("wine", "glass cup") are dropped; only exact vocabulary hits count.
            if label in labels:
                found.append({"label": label, "score": float(score), "box": [float(v) for v in box]})
    return found


def run_owl(img):
    inputs = processor(text=[[f"a photo of a {w}" for w in VOCAB]], images=img, return_tensors="pt").to(device)
    out = model(**inputs)
    side = max(img.size)
    # OWLv2 pads to a square, so boxes are relative to the padded image.
    res = processor.post_process_grounded_object_detection(out, threshold=0.2, target_sizes=[(side, side)])[0]
    return [
        {"label": VOCAB[int(l)], "score": float(s), "box": [float(v) for v in b]}
        for b, s, l in zip(res["boxes"], res["scores"], res["labels"])
    ]


def run_florence(img):
    # Open-vocabulary detection takes one phrase per prompt; all phrases go in one batch.
    # Florence-2 gives no confidence score, and it tends to return a box even for absent objects.
    task = "<OPEN_VOCABULARY_DETECTION>"
    found = []
    for labels in [VOCAB[i:i + 24] for i in range(0, len(VOCAB), 24)]:
        inputs = processor(text=[task + l for l in labels], images=[img] * len(labels), return_tensors="pt", padding=True).to(device, torch.float16)
        ids = model.generate(**inputs, max_new_tokens=256, num_beams=1, do_sample=False)
        for label, text in zip(labels, processor.batch_decode(ids, skip_special_tokens=False)):
            parsed = processor.post_process_generation(text, task=task, image_size=img.size)[task]
            for box in parsed.get("bboxes", []):
                found.append({"label": label, "score": 1.0, "box": [float(v) for v in box]})
    return found


def run_sam3(img):
    # The image is encoded once and reused for every label, batched in groups of CHUNK prompts.
    pixel = processor(images=img, return_tensors="pt").to(device)
    vision = model.get_vision_features(pixel_values=pixel.pixel_values.to(model.dtype))
    found = []
    for labels in chunks:
        k = len(labels)
        rep = transformers.models.sam3.modeling_sam3.Sam3VisionEncoderOutput(
            last_hidden_state=vision.last_hidden_state.expand(k, *vision.last_hidden_state.shape[1:]),
            fpn_hidden_states=tuple(t.expand(k, *t.shape[1:]) for t in vision.fpn_hidden_states),
            fpn_position_encoding=tuple(t.expand(k, *t.shape[1:]) for t in vision.fpn_position_encoding),
        )
        text = processor(text=labels, return_tensors="pt").to(device)
        out = model(vision_embeds=rep, input_ids=text.input_ids, attention_mask=text.attention_mask)
        res = processor.post_process_object_detection(out, threshold=0.3, target_sizes=[img.size[::-1]] * k)
        for label, r in zip(labels, res):
            for box, score in zip(r["boxes"], r["scores"]):
                found.append({"label": label, "score": float(score), "box": [float(v) for v in box]})
    return found


QWEN_PROMPTS = {
    "qwen": (
        "Find every clearly visible instance of these objects: " + ", ".join(v for v in VOCAB if v != "face") + ". "
        "Use only labels from that list, and skip objects that are not in the image. "
        'Answer with a JSON list like [{"bbox_2d": [x1, y1, x2, y2], "label": "cup"}] and nothing else.'
    ),
    "qwen-open": (
        "List the distinct physical objects and props visible in this film still: things a viewer could point at, "
        "such as clothing items, tools, furniture, vehicles, food, instruments or signs. Skip people, faces, body "
        "parts and background surfaces like walls, floor and sky. Use short singular common nouns. "
        'Answer with a JSON list like [{"bbox_2d": [x1, y1, x2, y2], "label": "cup"}] and nothing else.'
    ),
}


def parse_qwen(text, img):
    match = re.search(r"\[.*\]", text, re.S) or re.search(r"\[.*", text, re.S)
    try:
        items = json.loads(match.group(0)) if match else []
    except json.JSONDecodeError:
        # A list cut off by the token limit: keep the complete objects.
        items = [json.loads(m) for m in re.findall(r"\{[^{}]*\}", match.group(0))]
    found = []
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        box, label = it.get("bbox_2d"), str(it.get("label", "")).strip().lower()
        if not label or not isinstance(box, list) or len(box) != 4:
            continue
        if model_key == "qwen" and label not in VOCAB:
            continue
        # Qwen3-VL boxes are relative, on a 0-1000 scale.
        x0, y0, x1, y1 = (float(v) / 1000 for v in box)
        found.append({"label": label, "score": 1.0, "box": [x0 * img.width, y0 * img.height, x1 * img.width, y1 * img.height]})
    return found


def run_qwen_batch(imgs):
    # Generation dominates, so several frames share one generate call.
    convs = [[{"role": "user", "content": [{"type": "image", "image": im}, {"type": "text", "text": QWEN_PROMPTS[model_key]}]}] for im in imgs]
    inputs = processor.apply_chat_template(
        convs, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt", padding=True
    ).to(device)
    ids = model.generate(**inputs, max_new_tokens=800, do_sample=False)  # ~30 objects; longer answers are repetition loops
    texts = processor.batch_decode(ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)
    return [parse_qwen(t, im) for t, im in zip(texts, imgs)]


if model_key.startswith("qwen"):
    RUN_BATCH, BATCH = run_qwen_batch, 4  # 8 fills 16 GB and spills into shared memory
    processor.tokenizer.padding_side = "left"
else:
    run_one = {"owl": run_owl, "florence": run_florence, "sam3": run_sam3}.get(model_key, run_grounding)
    RUN_BATCH, BATCH = (lambda imgs: [run_one(im) for im in imgs]), 1
index = json.loads((LAB / "images" / slug / "index.json").read_text())
# Skip frames frames.py has already ruled out (duplicates, posters): report.py ignores them anyway.
checked = LAB / "detections" / f"{slug}-frames.json"
if checked.exists():
    info = json.loads(checked.read_text())
    index = [it for it in index if not info[it["file"]]["dup_of"] and not info[it["file"]]["flag"]]
index = index[:limit]
results, t0 = [], time.time()
for start in range(0, len(index), BATCH):
    items = index[start:start + BATCH]
    imgs = [Image.open(LAB / "images" / slug / it["file"]).convert("RGB") for it in items]
    smalls = [im.resize((DETECT_WIDTH, round(im.height * DETECT_WIDTH / im.width))) for im in imgs]
    with torch.no_grad():
        batch_dets = RUN_BATCH(smalls)
    for item, img, dets in zip(items, imgs, batch_dets):
        scale = DETECT_WIDTH / img.width
        for d in dets:
            d["box"] = [v / scale for v in d["box"]]
        results.append({"file": item["file"], "w": img.width, "h": img.height, "detections": dets})
        print(f"{len(results)}/{len(index)} {item['file']} {len(dets)} dets {time.time() - t0:.0f}s", flush=True)

out = LAB / "detections" / f"{slug}-{model_key}.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(results))
print(f"done in {time.time() - t0:.0f}s -> {out}")
