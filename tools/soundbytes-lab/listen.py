"""A listening page for choosing how much of the original soundtrack goes back under each voice (BED_DB in build.py).

Plays a built film's lines four ways: the voice alone, the voice with the rest of the soundtrack at -18 and -10 dB,
and the original mix. Use a film you already know (a "test-" slug), since the page shows the lines.

usage: python listen.py test-1       then open http://localhost:8767 (launch config "soundbytes-listen")
"""
import html, shutil, sys

import soundfile as sf

from build import SEPARATOR_MODEL, fade, level
from common import RATE, WORK, encode_mp3, read_json

VARIANTS = [("Voice alone", None), ("Bed at -18 dB", -18.0), ("Bed at -10 dB", -10.0), ("Original mix", 0.0)]

slug = sys.argv[1]
d = WORK / slug
out = WORK / "listen"
shutil.rmtree(out, ignore_errors=True)
out.mkdir(parents=True)
stems = d / "stems" / SEPARATOR_MODEL.split(".")[0]
rows = []
for n, line in enumerate(read_json(d / "lines.json")):
    voice = sf.read(stems / f"{line['video']}-voice.flac", dtype="float32")[0].mean(1)
    rest = sf.read(stems / f"{line['video']}-rest.flac", dtype="float32")[0].mean(1)
    a = int(line["start"] * RATE)
    b = a + int(line["clip"]["seconds"] * RATE)
    cells = []
    for v, (name, bed) in enumerate(VARIANTS):
        mix = voice[a:b] if bed is None else voice[a:b] + 10 ** (bed / 20) * rest[a:b]
        file = f"{n}-{v}.mp3"
        encode_mp3(level(fade(mix, 0.03, 0.08), voice[a:b]), out / file)
        cells.append(f'<td><audio controls preload="none" src="{file}"></audio></td>')
    rows.append(f"<tr><th>{html.escape(line['text'])}</th>{''.join(cells)}</tr>")

head = "".join(f"<th>{name}</th>" for name, _ in VARIANTS)
(out / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><title>Soundbytes listening</title>
<style>body{{font:15px system-ui;margin:24px;background:#14161b;color:#eee}}table{{border-collapse:collapse}}
th,td{{padding:8px;border-bottom:1px solid #333;text-align:left;vertical-align:middle}}th{{font-weight:500;max-width:22em}}
audio{{width:220px}}</style>
<h1>Which sounds most natural?</h1><p>The bed is the rest of the soundtrack, mixed back under the voice.</p>
<table><tr><th>Line</th>{head}</tr>{''.join(rows)}</table>""", encoding="utf-8")
print(f"{len(rows)} lines -> work/listen/index.html")
