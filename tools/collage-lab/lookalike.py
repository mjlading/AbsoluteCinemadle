"""Flag tiles in a keyword row that are probably the same shot, from report.py's cached DINOv2 embeddings.

report.py already drops a crop at DINOv2 0.86 or more, a bar set high so distinct shots of one drum
kit survive. Two frames of one shot with a moving hand land lower (0.65-0.82 measured), while
distinct shots of a generic object stay under about 0.55. Eyes, ears, mouths and ties of one actor
also reach 0.7-0.8 across different shots, so this only marks pairs for a human or agent to judge;
nothing is dropped. diverse() picks a default collage that avoids marked pairs.
"""
import itertools, pathlib, torch
import crops

LAB = pathlib.Path(__file__).parent
SIMILAR = 0.6


def similar(slug, hits):
    """{file: [files in the same row that look like the same shot]} for one row of a keywords json."""
    path = LAB / "detections" / f"{slug}-crops.pt"
    if not path.exists():
        return {}
    cache = torch.load(path)
    emb = {f: cache.get(crops.key(f, tuple(d["crop"])), {}).get("dino") for f, d in hits.items()}
    out = {f: [] for f in hits}
    for a, b in itertools.combinations([f for f in hits if emb[f] is not None], 2):
        if float(emb[a] @ emb[b]) >= SIMILAR:
            out[a].append(b)
            out[b].append(a)
    return out


def diverse(files, like, n=4):
    """The first n files in order that do not look like an earlier pick; topped up in order if too few."""
    picked = []
    for f in files:
        if len(picked) < n and not any(p in like.get(f, []) for p in picked):
            picked.append(f)
    return picked + [f for f in files if f not in picked][:n - len(picked)]
