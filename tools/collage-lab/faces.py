"""Find faces in a film's backdrops with YuNet, so report.py can drop crops that show one.

usage: python faces.py <slug>
"""
import truststore; truststore.inject_into_ssl()
import json, sys, time, pathlib, requests, cv2

LAB = pathlib.Path(__file__).parent
MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
MODEL = LAB / "models" / "face_detection_yunet_2023mar.onnx"
# Low on purpose: a missed face spoils the answer, a false one only costs a crop.
SCORE = 0.5

if not MODEL.exists():
    MODEL.parent.mkdir(exist_ok=True)
    MODEL.write_bytes(requests.get(MODEL_URL, timeout=60).content)

slug = sys.argv[1]
index = json.loads((LAB / "images" / slug / "index.json").read_text())
detector = cv2.FaceDetectorYN.create(str(MODEL), "", (320, 320), SCORE, 0.3, 5000)
results, t0 = {}, time.time()
for item in index:
    img = cv2.imread(str(LAB / "images" / slug / item["file"]))
    faces = []
    # Twice: at 1280 px wide, and at 2560 px for tiny background faces (originals vary from 1280 to 3840).
    for scale in (1280 / img.shape[1], 2560 / img.shape[1]):
        im = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
        detector.setInputSize((im.shape[1], im.shape[0]))
        _, found = detector.detect(im)
        for f in found if found is not None else []:
            x, y, w, h = (float(v) / scale for v in f[:4])
            faces.append({"box": [x, y, x + w, y + h], "score": float(f[14])})
    results[item["file"]] = faces
out = LAB / "detections" / f"{slug}-faces.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(results))
print(f"{slug}: {sum(map(len, results.values()))} faces in {len(results)} frames, {time.time() - t0:.0f}s -> {out.name}")
