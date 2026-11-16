#!/usr/bin/env bash
# usage: bash run_batch.sh <prefix>   (runs the whole pipeline over images/<prefix>-picks.json)
#
# Two stages run side by side, so downloads never wait on the GPU:
#   - downloads: fetch.py then faces.py (network and CPU), one title after another;
#   - GPU: frames.py, then SAM 3 and MM-DINO detect + report per title, as soon as its download stage is done.
# Every GPU step holds tools/gpu_lock.py, so only one large model is ever loaded, even with the Soundbytes lab
# building at the same time (two at once spilled GPU memory and froze the PC).
# Steps whose output exists are skipped, so a stopped batch can be run again.
set -u
cd "$(dirname "$0")"
P=.venv/Scripts/python.exe
[ -x "$P" ] || P=.venv/bin/python
LOCK="$P ../gpu_lock.py $P"
PICKS=images/$1-picks.json
mkdir -p detections
# One "<fetch arg> <slug>" line per title; a series is fetched as tv:<id>.
LIST=$($P -c "import json,sys
for p in json.load(open(sys.argv[1])):
    t = p.get('media_type', 'movie')
    print(('tv:' if t == 'tv' else '') + str(p['tmdb_id']) + '=' + p['slug'], p['slug'])" "$PICKS" | tr -d '\r')

downloads() {
  while read -r arg slug; do
    if [ ! -f "images/$slug/meta.json" ]; then
      $P fetch.py "$arg" || { echo "STEP fetch $slug FAILED"; touch "detections/$slug.failed"; continue; }
    fi
    if [ ! -f "detections/$slug-faces.json" ]; then
      $P faces.py "$slug" || { echo "STEP faces $slug FAILED"; touch "detections/$slug.failed"; continue; }
    fi
    echo "STEP download $slug ok"
  done <<< "$LIST"
}

gpu() {
  while read -r arg slug; do
    until [ -f "detections/$slug-faces.json" ] || [ -f "detections/$slug.failed" ]; do sleep 5; done
    [ -f "detections/$slug.failed" ] && continue
    if [ ! -f "detections/$slug-frames.json" ]; then
      $LOCK frames.py "$slug" > "detections/$slug-frames.log" 2>&1 && echo "STEP frames $slug ok" || echo "STEP frames $slug FAILED"
    fi
    for m in sam3 mmdino; do
      if [ ! -f "detections/$slug-$m.json" ]; then
        $LOCK detect.py $m "$slug" > "detections/$slug-$m-detect.log" 2>&1 && echo "STEP detect $m $slug ok" || echo "STEP detect $m $slug FAILED"
      fi
      if [ ! -f "detections/$slug-$m-keywords.json" ] || [ "detections/$slug-$m.json" -nt "detections/$slug-$m-keywords.json" ]; then
        $LOCK report.py "$slug" $m > "detections/$slug-$m-report.log" 2>&1 && echo "STEP report $m $slug ok" || echo "STEP report $m $slug FAILED"
      fi
    done
  done <<< "$LIST"
}

rm -f detections/$1-*.failed
downloads &
gpu
wait
echo "BATCH DONE"
