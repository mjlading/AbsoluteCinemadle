# Collage lab

Throwaway experiments for the keyword collage pipeline (see [docs/KEYWORD-COLLAGE.md](../../docs/KEYWORD-COLLAGE.md)).
They compare open-vocabulary detectors on TMDB backdrops and render the candidate collages for judging by eye.
Not part of the app; nothing here runs on Vercel.

## Set up

Needs Python 3.12+, and `TMDB_READ_ACCESS_TOKEN` in the repo's `.env.local`.

```sh
cd tools/collage-lab
python -m venv .venv
.venv/Scripts/activate   # or: source .venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128   # pick the CUDA build for your GPU on pytorch.org
pip install -r requirements.txt
```

Without a GPU, install the CPU build of torch instead; Grounding DINO then takes about 10 s per frame.

## Run

```sh
python fetch.py 105=back-to-the-future 244786=whiplash 120467=grand-budapest 680=pulp-fiction
python detect.py owl whiplash      # or: dino; an optional third argument limits the frame count
python report.py whiplash owl      # writes collages-whiplash-owl.jpg
python sheet.py whiplash           # thumbnails of all fetched frames
node count-backdrops.mjs           # backdrop counts for a sample of films and series
```

`detect.py` prints `device: cuda` when it is using the GPU.

Downloaded images, detections and rendered sheets are gitignored.
Delete them when done: TMDB images must not be kept for more than 6 months, and the repo is public.

## Findings so far

- TMDB coverage is enough: every sampled title has at least 33 textless backdrops, most 80-190.
- Backdrops are mostly real frames, but include posters, fan-made renders and the same frame in different crops.
- OWLv2 on Whiplash: drum, sheet music and cymbal make good collages, "ear" is a fun surprise, but "piano" and "painting" are mostly wrong.
- Its "face" detections are too weak to filter spoiler faces; a dedicated face detector is probably needed.
- The near-duplicate check (dHash) misses re-cropped copies of the same frame.
- Grounding DINO has not had a full run yet.
