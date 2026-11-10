#!/usr/bin/env bash
# usage: bash run_batch.sh <prefix>   (runs the whole pipeline over images/<prefix>-picks.json, one GPU job at a time)
set -e
P=.venv/Scripts/python.exe
PICKS=images/$1-picks.json
ARGS=$($P -c "import json,sys;print(' '.join(f\"{p['tmdb_id']}={p['slug']}\" for p in json.load(open(sys.argv[1]))))" $PICKS)
SLUGS=$($P -c "import json,sys;print(' '.join(p['slug'] for p in json.load(open(sys.argv[1]))))" $PICKS)
$P fetch.py $ARGS
for s in $SLUGS; do $P faces.py $s; $P frames.py $s; done
for s in $SLUGS; do
  for m in sam3 mmdino; do
    $P detect.py $m $s > detections/$s-$m-detect.log 2>&1 && echo "STEP detect $m $s ok" || echo "STEP detect $m $s FAILED"
    $P report.py $s $m > detections/$s-$m-report.log 2>&1 && echo "STEP report $m $s ok" || echo "STEP report $m $s FAILED"
  done
done
echo "BATCH DONE"
