# Collage lab

Throwaway experiments for the Close-Ups pipeline (see [docs/CLOSE-UPS.md](../../docs/CLOSE-UPS.md)).
They compare open-vocabulary detectors on TMDB backdrops and render the candidate collages for judging by eye.
Not part of the app; nothing here runs on Vercel.

## Set up

Needs Python 3.12+, and `TMDB_READ_ACCESS_TOKEN` in the repo's `.env.local`.

```sh
cd tools/collage-lab
python -m venv .venv
.venv/Scripts/activate   # or: source .venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128   # cu128 or newer for RTX 50-series
pip install -r requirements.txt
```

Without a GPU, install the CPU build of torch instead; expect minutes per frame for the larger models.
SAM 3 (`facebook/sam3`) is gated: request access on Hugging Face and log in with `hf auth login` first.

## Run

```sh
python fetch.py 105=back-to-the-future 244786=whiplash 120467=grand-budapest 680=pulp-fiction
python faces.py whiplash          # YuNet faces, for the spoiler filter
python frames.py whiplash         # near-duplicate frames and posters/fan art; writes frames-whiplash.jpg to check
python detect.py dino whiplash    # or owl, mmdino, llmdet, sam3, qwen, qwen-open; optional third argument limits frames
python report.py whiplash dino    # writes collages-whiplash-dino.jpg
python compare.py whiplash        # keywords per model, from the report runs
python blur.py whiplash           # blur calibration sheet: crops sorted by several sharpness measures
python review.py                  # blind review page on http://localhost:8765; `python review.py score` for results
python ab.py                      # blind A/B of SAM 3 vs MM-DINO, 20 pairs, on http://localhost:8766; `python ab.py score`
python pick_demo.py 3              # picks well-known films at random as demo-1..3, without printing them
python export_demo.py             # curated keywords (images/demo-curation.json) -> .data/keyword-collage.json (gitignored)
# then, from the repo root: npm run db:import-collage -- .data/keyword-collage.json
python sheet.py whiplash          # thumbnails of all fetched frames
node count-backdrops.mjs          # backdrop counts for a sample of films and series
```

`detect.py` prints `device: cuda` when it is using the GPU.
On an RTX 5060 Ti (16 GB), per frame: OWLv2 0.2 s, Grounding DINO 2 s, MM-Grounding-DINO or LLMDet large 7 s, Qwen3-VL-4B 6 s.

Downloaded images, detections and rendered sheets are gitignored.
Delete them when done: TMDB images must not be kept for more than 6 months, and the repo is public.

## Pipeline

1. `fetch.py` downloads textless backdrops at original size (mostly 1920-3840 px) and drops byte-level duplicates.
2. `frames.py` drops near-duplicates: CLIP similarity proposes pairs, SIFT keypoints with a RANSAC homography confirm them.
   CLIP alone cannot tell a re-crop of one frame from a different shot of the same scene.
   It also flags non-stills (posters, painted key art, renders, drawings, behind-the-scenes photos) with CLIP zero-shot labels.
3. `faces.py` finds faces with YuNet; only hits at score 0.7 or more are trusted.
4. `detect.py` runs one detector over the remaining frames.
5. `report.py` filters and places crops:
   - size: the object's short side at least 5% of frame width, and at least 160 native pixels per tile side;
   - faces: the square crop slides and tightens around the object to avoid faces; a crop is dropped when a face (a fifth of one is enough) covers 1% of it.
     Eye, ear and mouth keywords may show part of a face but never a whole one;
   - heads: Qwen3-VL-2B is asked whether any part of a face or head shows (chin, hair, a cut-off face); a Yes probability of 0.5 or more drops the crop.
     Face boxes alone miss these: the owner's two spoiler ties in Pulp Fiction scored 0.59 and 0.94, the tiles rated fine 0.35 or less;
   - text: Florence-2 OCR drops crops with a word from the title or the credits (director, top 10 cast and characters) and marks other readable text (orange) for the admin;
   - darkness: crops whose brightest 5% of pixels are still dark are dropped;
   - blur: edge crispness (`blur.py`) measured at tile size inside the object's box, normalised by contrast, so smoke, sky and shallow-focus backgrounds do not count.
     Below 1.3 tiles look blurry (1.0 for eye, ear and mouth: in-focus skin has few crisp edges).
     Laplacian variance mostly measured darkness, and CLIP "sharp vs blurry" did not rank blur at all;
   - look-alikes: a crop is skipped when it is one shot with a better crop of the same keyword: DINOv2 similarity 0.86 or more, or CLIP 0.95 or more.
     DINOv2 matches object instances (two frames of the Parasite peach 0.877, a black-and-white copy of an ear), where CLIP sees any two hands as alike.
     Whole-frame similarity does not help: re-grading changes the whole frame. The cost is that some distinct shots of one drum kit merge too;
   - a keyword needs 4 distinct crops; display groups (`[instruments]` for drum, cymbal, piano...) are shown where they add frames.
   - The report lists keywords that fell short and why (for example "shoe: 0 kept, lost to small 53").

## Findings

- TMDB coverage: every sampled title has at least 33 textless backdrops, most 80-190.
  After removing duplicates and posters, only 36-79 usable stills are left per film (Pulp Fiction 36, Back to the Future 79).
  That, not the detector, is the main limit on how many keywords a film gets.
- Original-size backdrops instead of w1280 roughly doubled the number of keywords: small props become usable tiles.
- Grounding DINO is the most precise detector, but only with the vocabulary split into prompts of about 8 labels.
  With all 71 labels in one prompt its scores are diluted and it finds almost nothing.
- Owner's blind A/B of SAM 3 vs MM-Grounding-DINO (19 pairs over 5 films): both fine 8, MM-DINO 6, SAM 3 4, neither 1.
  Quality is close; MM-DINO finds more keywords per film, and its mislabelled rows are for the admin to drop, so it is the main candidate.
- SAM 3: confident, well-separated scores (0.5 is a safe cut-off), no invented objects, and 2.3 s per frame in bf16.
  It finds 4-15 keywords per film across all eight films, with "hand" in every one (11-28 frames), which suits the free starter keyword.
  Its own "face" hits (0.8-0.95) also feed the face filter.
  Run one GPU job at a time: SAM 3 next to MM-Grounding-DINO spilled GPU memory into system RAM and froze the PC.
- MM-Grounding-DINO large has the best recall: 20 keywords against 5 for Grounding DINO.
  Its top rows (hand, drum, cymbal, sheet music, ear, mouth, eye) are right; lower-scoring rows mix up labels (sheet music as "newspaper", "book" and "sign"), so it needs a higher score bar than 0.35.
- Qwen3-VL-4B naming objects freely is accurate (trombone, drumsticks, music stand) but spreads hits over many nouns, so few reach 4 frames (3 on Pulp Fiction); it suits the wildcard tagger role better than detection.
- OWLv2 finds more keywords but more of them are wrong (saxophones as "trumpet", a clock tower as "weapon", binoculars as "camera").
- Florence-2's open-vocabulary detection is unusable: it returns a box for every label asked, present or not.
  Its OCR is good and is used for the text check.
- Faces: OWLv2's "face" label misses most faces; YuNet at score 0.7 or more catches profiles and background faces.
  Even a face covering 1-4% of a crop identifies a lead (Fletcher behind a cymbal, Marty in his vest).
- Text is a spoiler source of its own: the hotel's name on a book cover, "LOBBY BOY" on a hat, "OUTATIME" on a number plate.
- Iconic props (the DeLorean, Marty's vest, Mendl's boxes) give a film away with no face or text; that is for the admin's tier choice, which sets the reveal order.
- "hair" is a face in disguise: its boxes cover the whole head. The owner keeps it as an easy-tier keyword, which opens late.
- Owner's first ratings: hand, eye, mouth and ear are great keywords; neckwear crops often show too much head; blurry tiles are useless.
- Whiplash is a poor benchmark on its own (instruments everywhere); The Godfather, Mad Max: Fury Road, Amélie and Parasite were added.
- The Godfather with MM-Grounding-DINO: 16 keywords (hand 21, neckwear 16, mouth 8, ear 7, drinks 6...).
  Shoes, hats and earrings are mostly lost as too small in wide shots.
- The CLIP poster check over-fires on heavily graded films: about 10 of Mad Max's 85 real stills are flagged as painted posters or concept art.
