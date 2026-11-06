"""Print which keywords each model found per film, from report.py's keyword files.

usage: python compare.py <slug> [...]
"""
import json, sys, pathlib

LAB = pathlib.Path(__file__).parent
for slug in sys.argv[1:]:
    print(f"\n{slug}")
    for path in sorted((LAB / "detections").glob(f"{slug}-*-keywords.json")):
        model = path.name[len(slug) + 1:-len("-keywords.json")]
        kw = json.loads(path.read_text())
        singles = [f"{l} {len(v)}" for l, v in kw.items() if not l.startswith("[")]
        groups = [f"{l} {len(v)}" for l, v in kw.items() if l.startswith("[")]
        print(f"  {model:10} {len(singles):2} keywords: {', '.join(singles)}")
        if groups:
            print(f"  {'':10}    groups: {', '.join(groups)}")
