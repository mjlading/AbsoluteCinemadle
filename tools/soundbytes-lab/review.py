"""A page for reviewing built boards before export: each film's 5 lines in the order they open, with what made
each one ordinary or iconic. It shows the film and its lines, so it spoils them.

usage: python review.py [slug ...]     then open http://localhost:8767 (launch config "soundbytes-listen")
"""
import html, shutil, sys

from common import WORK, read_json

picks = read_json(WORK / "picks.json")
wanted = set(sys.argv[1:])
out = WORK / "listen"
shutil.rmtree(out, ignore_errors=True)
out.mkdir(parents=True)

sections = []
for pick in picks:
    slug, d = pick["slug"], WORK / pick["slug"]
    if (wanted and slug not in wanted) or not (d / "lines.json").exists():
        continue
    meta = read_json(d / "meta.json")
    rows = []
    for line in sorted(read_json(d / "lines.json"), key=lambda l: l["slot"]):
        file = f"{slug}-{line['slot']}.mp3"
        shutil.copyfile(d / line["clip"]["file"], out / file)
        signals = ", ".join(f"{k} {v}" for k, v in line["signals"].items() if v)
        rows.append(
            f"<tr><td>{line['slot'] + 1}</td><td class=role-{line['role']}>{line['role']}</td>"
            f"<td>{html.escape(line['text'])}</td><td>{line['voice']}</td><td>{line['iconic'] or ''}</td>"
            f"<td class=sig>{html.escape(signals)}</td>"
            f'<td><audio controls preload="none" src="{file}"></audio></td></tr>'
        )
    theme = (read_json(d / "theme.json") if (d / "theme.json").exists() else {}).get("theme")
    if theme:
        # The board drops its least iconic line (row 3) for the theme; the theme plays from Apple's servers.
        rows.append(
            f"<tr><td>5</td><td class=role-iconic>theme</td><td>Apple preview, {theme['start']} s to "
            f"{theme['start'] + theme['seconds']:.1f} s</td><td></td><td></td><td class=sig>replaces line 3</td>"
            f'<td><audio controls preload="none" src="{theme["previewUrl"]}#t={theme["start"]},'
            f'{theme["start"] + theme["seconds"]}"></audio></td></tr>'
        )
    sections.append(f"<h2>{html.escape(meta['title'])} ({meta['year']}) <small>{slug}</small></h2>"
                    f"<table><tr><th>#</th><th>Role</th><th>Line</th><th>Voice</th><th>Iconic</th><th>Signals</th>"
                    f"<th></th></tr>{''.join(rows)}</table>")

(out / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><title>Soundbytes boards</title>
<style>body{{font:15px system-ui;margin:24px;background:#14161b;color:#eee}}table{{border-collapse:collapse;margin-bottom:32px}}
th,td{{padding:7px 9px;border-bottom:1px solid #333;text-align:left;vertical-align:middle}}small{{color:#888;font-weight:400}}
.role-iconic{{color:#f2c641}}.sig{{color:#9aa3b1;font-size:13px}}audio{{width:220px}}</style>
<h1>Soundbytes boards</h1><p>Lines in the order they open: ordinary first, then iconic, the most iconic last.</p>
{''.join(sections)}""", encoding="utf-8")
print(f"{len(sections)} boards -> work/listen/index.html")
