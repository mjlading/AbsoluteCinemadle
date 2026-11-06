import sys, pathlib
from PIL import Image
d = pathlib.Path("images") / sys.argv[1]
files = sorted(d.glob("*.jpg"))
cols, w, h = 8, 240, 135
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "black")
for i, f in enumerate(files):
    im = Image.open(f); im.thumbnail((w, h))
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(f"sheet-{sys.argv[1]}.jpg", quality=80)
