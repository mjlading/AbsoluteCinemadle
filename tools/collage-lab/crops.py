"""Per-crop checks for report.py: readable text (Florence-2 OCR), CLIP and DINOv2 embeddings for diversity, and
whether any part of a head shows (Qwen3-VL), which catches what face boxes miss: a chin, hair, a cut-off face.

Results are cached per film in detections/<slug>-crops.pt, keyed by frame and crop box.
"""
import pathlib, torch
import numpy as np
from PIL import Image

LAB = pathlib.Path(__file__).parent
CLIP = "openai/clip-vit-large-patch14"
OCR = "florence-community/Florence-2-large"
VLM = "Qwen/Qwen3-VL-2B-Instruct"
# DINOv2 matches object instances, so it spots two frames of one shot (a peach turned slightly,
# a black-and-white copy of the same ear) where CLIP only sees "a peach" in both.
DINO = "facebook/dinov2-base"
HEAD_QUESTION = (
    "Is any part of a person's face or head visible in this image, even at the edge: "
    "eyes, nose, mouth, chin, ears or hair? Answer Yes or No."
)


def key(file, crop):
    return f"{file}|" + ",".join(str(round(v)) for v in crop)


def analyse(slug, wanted):
    """wanted: list of (file, crop). Returns {key: {"text": str, "emb": tensor, "bright": float}}."""
    path = LAB / "detections" / f"{slug}-crops.pt"
    cache = torch.load(path) if path.exists() else {}
    todo = [(f, c) for f, c in dict.fromkeys((f, tuple(c)) for f, c in wanted) if key(f, c) not in cache]
    if todo:
        import transformers
        device = "cuda" if torch.cuda.is_available() else "cpu"
        images = [Image.open(LAB / "images" / slug / f).convert("RGB").crop(c).resize((384, 384), Image.LANCZOS) for f, c in todo]

        clip = transformers.CLIPModel.from_pretrained(CLIP, dtype=torch.float16).to(device).eval()
        clip_proc = transformers.CLIPProcessor.from_pretrained(CLIP)
        embs = []
        with torch.no_grad():
            for i in range(0, len(images), 32):
                px = clip_proc(images=images[i:i + 32], return_tensors="pt")["pixel_values"].to(device, torch.float16)
                embs.append(torch.nn.functional.normalize(clip.get_image_features(pixel_values=px).pooler_output, dim=-1).float().cpu())
        del clip
        embs = torch.cat(embs)

        ocr = transformers.Florence2ForConditionalGeneration.from_pretrained(OCR, dtype=torch.float16).to(device).eval()
        ocr_proc = transformers.AutoProcessor.from_pretrained(OCR)
        texts = []
        with torch.no_grad():
            for i in range(0, len(images), 16):
                batch = images[i:i + 16]
                inputs = ocr_proc(text=["<OCR>"] * len(batch), images=batch, return_tensors="pt", padding=True).to(device, torch.float16)
                ids = ocr.generate(**inputs, max_new_tokens=64, num_beams=1, do_sample=False)
                texts += [t.strip() for t in ocr_proc.batch_decode(ids, skip_special_tokens=True)]
        del ocr
        for (f, c), e, t, im in zip(todo, embs, texts, images):
            # 95th percentile of luminance: low means even the brightest part of the crop is dark.
            bright = float(np.percentile(np.asarray(im.convert("L")), 95))
            cache[key(f, c)] = {"text": t, "emb": e, "bright": bright}
        torch.save(cache, path)
    missing = [k for k in dict.fromkeys(key(f, c) for f, c in wanted) if "head" not in cache[k]]
    if missing:
        for k, p_yes in zip(missing, head_probability(slug, missing)):
            cache[k]["head"] = p_yes
        torch.save(cache, path)
    missing = [k for k in dict.fromkeys(key(f, c) for f, c in wanted) if "dino" not in cache[k]]
    if missing:
        for k, e in zip(missing, dino_embeddings(slug, missing)):
            cache[k]["dino"] = e
        torch.save(cache, path)
    return {key(f, c): cache[key(f, tuple(c))] for f, c in wanted}


def crop_image(slug, k, size):
    f, c = k.split("|")
    return Image.open(LAB / "images" / slug / f).convert("RGB").crop([float(v) for v in c.split(",")]).resize((size, size), Image.LANCZOS)


def dino_embeddings(slug, keys, batch=32):
    import transformers
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = transformers.AutoModel.from_pretrained(DINO, dtype=torch.float16).to(device).eval()
    proc = transformers.AutoImageProcessor.from_pretrained(DINO)
    out = []
    with torch.no_grad():
        for i in range(0, len(keys), batch):
            px = proc(images=[crop_image(slug, k, 224) for k in keys[i:i + batch]], return_tensors="pt")["pixel_values"].to(device, torch.float16)
            out += list(torch.nn.functional.normalize(model(pixel_values=px).pooler_output.float(), dim=-1).cpu())
    del model
    return out


def head_probability(slug, keys, batch=8):
    """Probability that the VLM answers Yes to HEAD_QUESTION, read from its first-token logits."""
    import transformers
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = transformers.AutoModelForImageTextToText.from_pretrained(VLM, dtype=torch.bfloat16).to(device).eval()
    proc = transformers.AutoProcessor.from_pretrained(VLM)
    proc.tokenizer.padding_side = "left"
    yes, no = (proc.tokenizer.encode(w, add_special_tokens=False)[0] for w in ("Yes", "No"))
    out = []
    for i in range(0, len(keys), batch):
        imgs = [crop_image(slug, k, 384) for k in keys[i:i + batch]]
        convs = [[{"role": "user", "content": [{"type": "image", "image": im}, {"type": "text", "text": HEAD_QUESTION}]}] for im in imgs]
        inputs = proc.apply_chat_template(convs, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt", padding=True).to(device)
        with torch.no_grad():
            logits = model(**inputs).logits[:, -1, [yes, no]].float()
        out += logits.softmax(-1)[:, 0].tolist()
    del model
    return out
