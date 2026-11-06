"""Sharpness of a collage tile, measured the way the player sees it.

Edge crispness (the strongest gradients relative to the contrast range) is the measure used.
A crop is judged at display size (a soft 1000 px crop looks sharp as a 240 px tile; an upscaled or
out-of-focus one does not), and only inside the object's box, so smoke, sky or a shallow-focus
background around a sharp object does not count against it. The score is normalised by the region's
contrast, so dark or low-contrast scenes are not mistaken for blur.

usage: python blur.py <slug> [...]   # calibration sheet blur-<slugs>.jpg: crops sorted by each measure
"""
import json, sys, pathlib
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

LAB = pathlib.Path(__file__).parent
EVAL = 240  # tile size the measure is taken at


def region(img, box, crop):
    """Grey 0-1 crop at EVAL px, and the object's box inside it."""
    tile = np.asarray(img.crop(crop).convert("L").resize((EVAL, EVAL), Image.LANCZOS), dtype=np.float32) / 255
    s = EVAL / (crop[2] - crop[0])
    x0, y0 = max(0, int((box[0] - crop[0]) * s)), max(0, int((box[1] - crop[1]) * s))
    x1, y1 = min(EVAL, int((box[2] - crop[0]) * s)), min(EVAL, int((box[3] - crop[1]) * s))
    return tile, (x0, y0, x1, y1)


def measures(img, box, crop):
    tile, (x0, y0, x1, y1) = region(img, box, crop)
    lap = cv2.Laplacian(tile, cv2.CV_32F, ksize=3)[y0:y1, x0:x1]
    g = tile[y0:y1, x0:x1]
    # High-frequency share: spectral energy above a quarter of Nyquist, of all energy except DC.
    win = g - g.mean()
    win = win * np.outer(np.hanning(win.shape[0]), np.hanning(win.shape[1]))
    spec = np.abs(np.fft.fftshift(np.fft.fft2(win))) ** 2
    fy, fx = np.meshgrid(np.fft.fftshift(np.fft.fftfreq(win.shape[0])), np.fft.fftshift(np.fft.fftfreq(win.shape[1])), indexing="ij")
    r = np.hypot(fx, fy)
    hf = float(spec[r > 0.125].sum() / max(spec[r > 0].sum(), 1e-9))
    # Edge crispness: the strongest gradients relative to the region's contrast range. Blur widens every
    # edge, so even a smooth, sharp object keeps a few crisp ones (its outline, highlights).
    gx, gy = cv2.Sobel(tile, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(tile, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.hypot(gx, gy)[y0:y1, x0:x1]
    lo, hi = np.percentile(g, [2, 98])
    edge = float(np.percentile(mag, 99.5) / (hi - lo + 0.03))
    return {
        "edge": edge,
        "lapvar": float(lap.var() * 1e4),
        "lap/contrast": float(lap.std() / (g.std() + 0.02)),
        "hf share": hf,
    }


def sharpness(img, box, crop):
    """The measure report.py uses: edge crispness, which ranked blur best by eye (lap/contrast and the
    high-frequency share also punish smooth sharp objects; CLIP "sharp vs blurry" does not rank blur)."""
    return measures(img, box, crop)["edge"]


if __name__ == "__main__":
    slugs = sys.argv[1:]
    crops = {}
    for slug in slugs:
        for path in (LAB / "detections").glob(f"{slug}-*-keywords.json"):
            for label, hits in json.loads(path.read_text()).items():
                for file, d in hits.items():
                    crops[(slug, file, tuple(round(v) for v in d["crop"]))] = d["box"]
    import torch, transformers, crops as crop_checks
    clip = transformers.CLIPModel.from_pretrained(crop_checks.CLIP).eval()
    proc = transformers.CLIPProcessor.from_pretrained(crop_checks.CLIP)
    with torch.no_grad():
        t = proc(text=["a sharp, in-focus photo", "a blurry, out-of-focus photo"], return_tensors="pt", padding=True)
        text = torch.nn.functional.normalize(clip.get_text_features(**t).pooler_output, dim=-1)
    caches = {slug: torch.load(LAB / "detections" / f"{slug}-crops.pt") for slug in slugs}
    T, per = 120, 16
    rows, thumbs, last = [], {}, (None, None)
    for (slug, file, crop), box in sorted(crops.items()):
        # One full-size frame in memory at a time; only small thumbnails are kept for the sheet.
        if last[0] != (slug, file):
            last = ((slug, file), Image.open(LAB / "images" / slug / file).convert("RGB"))
        img = last[1]
        thumbs[(slug, file, crop)] = img.crop(crop).resize((T, T), Image.LANCZOS)
        ms = measures(img, box, crop)
        emb = caches[slug][crop_checks.key(file, crop)]["emb"]
        ms["clip sharp"] = float((100 * emb @ text.T).softmax(-1)[0])
        rows.append(((slug, file, crop), ms))
    print(f"{len(rows)} crops")
    font = ImageFont.load_default(size=13)
    names = list(rows[0][1])
    sheet = Image.new("RGB", (per * (T + 4), len(names) * 3 * (T + 20)), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    for m, name in enumerate(names):
        ranked = sorted(rows, key=lambda r: r[1][name])
        n = len(ranked)
        # Row 1-2: the 32 lowest scores; row 3: 16 samples spread over the rest, for comparison.
        picks = ranked[:2 * per] + [ranked[int(2 * per + (n - 2 * per - 1) * i / (per - 1))] for i in range(per)]
        for k, ((slug, file, crop), ms) in enumerate(picks):
            x, y = (k % per) * (T + 4), (m * 3 + k // per) * (T + 20)
            sheet.paste(thumbs[(slug, file, crop)], (x, y))
            draw.text((x + 2, y + T + 2), f"{ms[name]:.3f}" if ms[name] < 10 else f"{ms[name]:.0f}", fill="white", font=font)
        draw.text((4, m * 3 * (T + 20) + 2), name, fill="yellow", font=font)
    out = LAB / f"blur-{'-'.join(slugs)}.jpg"
    sheet.save(out, quality=85)
    print(f"-> {out.name}")
