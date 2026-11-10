"""Shared helpers for the Soundbytes lab: paths, TMDB, ffmpeg and audio I/O."""
import truststore; truststore.inject_into_ssl()
import json, os, pathlib, re, secrets, shutil, string, subprocess, unicodedata

import imageio_ffmpeg
import numpy as np
import requests

LAB = pathlib.Path(__file__).parent
ROOT = LAB.parent.parent
WORK = LAB / "work"
EXPORT = ROOT / ".data" / "soundbytes"
API = "https://api.themoviedb.org/3"
RATE = 44_100

_env = (ROOT / ".env.local").read_text()
_TMDB = {"Authorization": f"Bearer {re.search(r'^TMDB_READ_ACCESS_TOKEN=(.+)$', _env, re.M).group(1).strip()}"}
_ALPHABET = string.ascii_letters + string.digits
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Some tools (audio-separator, via pydub) run plain `ffmpeg` from the PATH; give them the bundled one under that name.
_bin = LAB / ".bin"
_exe = _bin / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
if not _exe.exists():
    _bin.mkdir(exist_ok=True)
    shutil.copy2(FFMPEG, _exe)
os.environ["PATH"] = f"{_bin}{os.pathsep}{os.environ['PATH']}"


def tmdb(path, **params):
    r = requests.get(API + path, headers=_TMDB, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def new_id(n=12):
    """A random id that says nothing about the film."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


def read_json(path):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))


def write_json(path, data):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")


def decode(path, rate=RATE, channels=2):
    """Any audio file as float32 samples, shaped (channels, samples)."""
    raw = subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", str(channels), "-ar", str(rate), "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).T.copy()


def encode_mp3(samples, path, rate=RATE):
    """Mono float samples to a bare MP3: no ID3 tags or other metadata, so the file can't name the film."""
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(rate), "-ac", "1", "-i", "-",
         "-map_metadata", "-1", "-id3v2_version", "0", "-write_id3v1", "0",
         "-codec:a", "libmp3lame", "-b:a", "96k", str(path)],
        input=np.ascontiguousarray(samples, dtype=np.float32).tobytes(), check=True,
    )


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)))) if x.size else 0.0


def normalize(text):
    """Lowercase ASCII words, for comparing transcripts with names."""
    text = unicodedata.normalize("NFKD", text.replace("’", "'")).encode("ascii", "ignore").decode()
    return re.findall(r"[a-z0-9']+", text.lower())
