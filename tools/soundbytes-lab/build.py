"""Build the clips for picked films: lines of dialogue from the film's official videos.

Per film, in work/<slug>/ (gitignored), each step skipped when its output exists:
  1. meta.json        TMDB details, official videos and the names a clip must never say
  2. videos/          audio of the film's official scene clips and trailers, downloaded with yt-dlp
  3. stems/<model>/   voices separated from music and effects (a Mel-Band RoFormer vocals model),
                      where the voices really speak (Silero VAD), and words with timestamps (Whisper turbo)
  4. signals.json     what makes a line iconic: video titles, views, most-replayed curves and Wikiquote (signals.py)
  5. lines.json       the board's 5 lines, cut into clips/ as bare MP3s with a mouth track: first a side character's
                      and a lead's ordinary lines, then the 3 most iconic, the most iconic last.
                      The iconic lines' order comes from the signals, or from iconic-judged.json when a Claude Code
                      agent has ranked iconic-candidates.json (see "Judging" in README.md)
  6. theme.json       the film's theme: an iTunes preview and the window of it to play (theme.py)

Output stays spoiler-free: counts and scores only, never titles or lines.

usage: python build.py [slug ...]     (default: every pick in work/picks.json)
"""
import difflib, logging, math, re, sys

import numpy as np
import soundfile as sf
from wordfreq import zipf_frequency

from common import LAB, RATE, WORK, decode, encode_mp3, new_id, normalize, read_json, rms, tmdb, write_json
from signals import quoted, signals_step
from theme import theme_step

# Scene clips are the film's own sound; trailers add a narrator, so they only fill in, and only with voices
# also heard in a scene clip. A film needs MIN_CLIPS scene clips to get a board.
MAX_CLIPS, MAX_TRAILERS, MIN_CLIPS = 10, 3, 4
CLIP_BONUS = 0.5
LINES_PER_FILM = 5
ORDINARY_LINES = 2  # the first lines: a side character's, then a lead's, picked as before; the rest are iconic
SEPARATOR_MODEL = "vocals_mel_band_roformer.ckpt"
# The rest of the soundtrack is mixed back this far under each line: voices stripped bare sound hollow and strange.
BED_DB = -10.0
# A line is one or a few sentences of one moment: between these lengths, with clean silence around it.
LINE_MIN_S, LINE_MAX_S, LINE_TARGET_S = 2.0, 4.6, 3.5
# Famous lines are often short or shouted over music ("I'm the king of the world!"), so a line with an iconic
# signal may be shorter and rougher than an ordinary one.
ICONIC_MIN_S, ICONIC_MIN_WORDS = 1.0, 2
ICONIC_FLOOR = 0.8  # the least iconic score (see iconic_score) for a line to count as iconic at all
ICONIC_CANDIDATES = 12  # how many iconic lines go to the judge (iconic-candidates.json), best first
HARD_GAP_S = 0.3  # a pause this long always ends a line
CUT_GAP_S = 0.15  # the least silence there must be at a cut
PAD_BEFORE_S, PAD_AFTER_S = 0.06, 0.14  # room kept around the speech at a cut
MIN_SPEECH_SHARE = 0.6  # of a line's length the voice detector must hear as speech
# How far under the rest of the soundtrack a voice may be; below this the separated voice comes out mangled.
MIN_PURITY_DB = -6.0
RARE_ZIPF = 4.0  # a title word rarer than this (on the wordfreq scale) gives the film away on its own
SAME_VOICE = 0.75  # cosine distance under which two lines are taken for one voice (separated voices vary a lot)
MAIN_SHARE = 0.5  # a voice with at least this share of the top voice's lines is a main character too
MAIN_BONUS = 0.3  # the main character's lines are the likeliest to be a voice players know
# The mouth track: the voice alone, one digit (0-9) of loudness per frame, for the characters to talk to.
MOUTH_FPS = 25

STOPWORDS = {"the", "a", "an", "and", "of", "in", "on", "to", "for", "with", "from", "part", "at", "by", "is", "it"}
# Trailer copy, not film dialogue.
TRAILER_PHRASES = [
    "coming soon", "in theaters", "in theatres", "this summer", "this christmas", "this fall", "this winter",
    "this spring", "only in", "from the director", "from director", "academy award", "rated", "imax", "on blu ray",
    "streaming", "now playing", "this year", "from the producers", "from the studio", "now available", "own it",
    "on digital", "4k", "dvd", "subscribe",
]

# "Dr." ends no sentence, though Whisper punctuates it like one.
TITLE_RE = re.compile(r"^(Dr|Mr|Mrs|Ms|St|Jr|Sr|Mt|Prof|Gen|Capt|Lt|Sgt)\.$")

_models = {}


def log(slug, msg):
    print(f"{slug}: {msg}", flush=True)


# 1. meta ---------------------------------------------------------------------------------------------------------

def name_tokens(text, generic=STOPWORDS):
    return {t for t in normalize(re.sub(r"\(.*?\)", " ", text)) if len(t) >= 3 and t not in generic}


def title_names(film):
    """The names a line must not say: the title, the original title and the collection's."""
    names = [film["title"], film.get("original_title") or ""]
    if film.get("belongs_to_collection"):
        names.append(film["belongs_to_collection"]["name"].replace("Collection", ""))
    return sorted({n.strip() for n in names if n.strip()})


def meta_step(slug, tmdb_id, d):
    path = d / "meta.json"
    if path.exists():
        meta = read_json(path)
        if "title_names" not in meta:  # from before names were allowed: add the titles, keep the cached videos
            film = tmdb(f"/movie/{tmdb_id}", language="en-US")
            meta = {k: v for k, v in meta.items() if k != "forbidden"} | {"title_names": title_names(film)}
            write_json(path, meta)
        return meta
    film = tmdb(f"/movie/{tmdb_id}", append_to_response="credits,videos", language="en-US")
    official = sorted((v for v in film["videos"]["results"]
                       if v["site"] == "YouTube" and v["official"] and v.get("iso_639_1") == "en"),
                      key=lambda v: v["published_at"])
    clips = [v for v in official if v["type"] == "Clip"][:MAX_CLIPS]
    trailers = sorted((v for v in official if v["type"] in ("Trailer", "Teaser")), key=lambda v: v["type"] != "Trailer")
    videos = clips + trailers[:MAX_TRAILERS]
    cast = film["credits"]["cast"]
    meta = {
        "tmdb_id": film["id"],
        "title": film["title"],
        "year": int(film["release_date"][:4]) if film.get("release_date") else None,
        "poster_path": film.get("poster_path"),
        "cast": [{"tmdbId": c["id"], "name": c["name"]} for c in cast[:8]],
        "videos": [{"key": v["key"], "type": v["type"]} for v in videos],
        "title_names": title_names(film),
    }
    write_json(path, meta)
    return meta


# 2. videos -------------------------------------------------------------------------------------------------------

def download_step(slug, meta, d):
    import yt_dlp

    out = d / "videos"
    out.mkdir(parents=True, exist_ok=True)
    files = []
    for i, t in enumerate(meta["videos"]):
        existing = [p for p in out.glob(f"{i}.*") if p.suffix not in (".part", ".ytdl")]
        if not existing:
            opts = {"format": "bestaudio/best", "outtmpl": str(out / f"{i}.%(ext)s"), "quiet": True,
                    "no_warnings": True, "noprogress": True, "js_runtimes": {"node": {}}}
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([f"https://www.youtube.com/watch?v={t['key']}"])
            except Exception as e:  # removed, private or age-gated: skip that video
                log(slug, f"video {i} could not be downloaded ({type(e).__name__})")
                continue
            existing = [p for p in out.glob(f"{i}.*") if p.suffix not in (".part", ".ytdl")]
        if existing:
            files.append((i, existing[0]))
    return files


# 3. stems, speech and words --------------------------------------------------------------------------------------

def separator():
    if "separator" not in _models:
        from audio_separator.separator import Separator

        tmp = WORK / "tmp"
        tmp.mkdir(parents=True, exist_ok=True)
        s = Separator(log_level=logging.WARNING, model_file_dir=str(LAB / "models"), output_dir=str(tmp),
                      output_format="FLAC", sample_rate=RATE)
        s.load_model(SEPARATOR_MODEL)
        _models["separator"] = s
    return _models["separator"]


def separate(mix):
    """(voices, everything else) from stereo samples at RATE, both stereo and the same length."""
    tmp = WORK / "tmp"
    for f in tmp.glob("*"):
        f.unlink()
    sf.write(tmp / "mix.wav", mix.T, RATE, subtype="FLOAT")
    names = separator().separate(str(tmp / "mix.wav"))
    vocals_file = next(n for n in names if "(vocals)" in n.lower())
    voice = sf.read(tmp / vocals_file, dtype="float32", always_2d=True)[0].T
    voice = voice[:, :mix.shape[1]] if voice.shape[1] >= mix.shape[1] else np.pad(voice, ((0, 0), (0, mix.shape[1] - voice.shape[1])))
    return voice, mix - voice


def speech_spans(voice_16k):
    """Where the voice stem really has speech, as [start, end] seconds."""
    if "vad" not in _models:
        from silero_vad import load_silero_vad

        _models["vad"] = load_silero_vad()
    import torch
    from silero_vad import get_speech_timestamps

    spans = get_speech_timestamps(torch.from_numpy(voice_16k), _models["vad"], sampling_rate=16_000, threshold=0.5,
                                  min_silence_duration_ms=80, speech_pad_ms=0, return_seconds=True)
    return [[s["start"], s["end"]] for s in spans]


def transcribe(audio_16k):
    if "whisper" not in _models:
        import whisper

        _models["whisper"] = whisper.load_model("turbo", device="cuda")
    result = _models["whisper"].transcribe(audio_16k, language="en", word_timestamps=True,
                                           condition_on_previous_text=False, temperature=0.0, fp16=True)
    return [
        {"no_speech": s["no_speech_prob"], "words": [
            {"text": w["word"].strip(), "start": w["start"], "end": w["end"], "p": w["probability"]}
            for w in s.get("words", []) if w["word"].strip()]}
        for s in result["segments"]
    ]


def stems_step(video, d):
    """The voice and the rest of one video, its speech spans and its words, made once and cached."""
    i, path = video
    out = d / "stems" / SEPARATOR_MODEL.split(".")[0]
    v_path, r_path, a_path = out / f"{i}-voice.flac", out / f"{i}-rest.flac", out / f"{i}-analysis.json"
    if not a_path.exists():
        out.mkdir(parents=True, exist_ok=True)
        voice, rest = separate(decode(path))
        sf.write(v_path, voice.T, RATE, subtype="PCM_16")
        sf.write(r_path, rest.T, RATE, subtype="PCM_16")
        voice_16k = decode(v_path, 16_000, 1)[0]
        write_json(a_path, {"speech": speech_spans(voice_16k), "segments": transcribe(voice_16k)})
    return v_path, r_path, read_json(a_path)


# 4. lines --------------------------------------------------------------------------------------------------------

def title_rule(names):
    """What gives the title away: the whole title (or a part of it split at a colon) as a phrase, and any title
    word rare enough to name the film on its own ("Titanic", "Batman"; not "back" or "future").
    Character names, places and people are allowed: the owner wants the game easier (2026-11-10)."""
    phrases = {" ".join(normalize(part)) for n in names for part in [n, *n.split(":")] if normalize(part)}
    words = {t for n in names for t in name_tokens(n) if zipf_frequency(t, "en") < RARE_ZIPF}
    return phrases, words


def says_forbidden(text, rule):
    """Whether a line says the film's title (see title_rule), or is trailer copy."""
    phrases, rare = rule
    words = [re.sub(r"'s$", "", w) for w in normalize(text)]
    joined = f" {' '.join(words)} "
    return (any(w in rare for w in words) or any(f" {p} " in joined for p in phrases)
            or any(p in joined for p in TRAILER_PHRASES))


def candidate_lines(segments, min_s=LINE_MIN_S, min_words=3):
    """Runs of words that start and end a sentence, with enough silence at both cuts."""
    words = [w for s in segments if s["no_speech"] < 0.6 for w in s["words"]]
    out = []
    for a in range(len(words)):
        gap_before = words[a]["start"] - words[a - 1]["end"] if a else math.inf
        after_end = a == 0 or gap_before > HARD_GAP_S or (
            re.search(r"[.?!]$", words[a - 1]["text"]) and not TITLE_RE.match(words[a - 1]["text"]))
        # A whole sentence starts with a capital; Whisper marks a continued one with "..." or lowercase.
        if not after_end or not re.match(r"[A-Z0-9]", words[a]["text"]) or gap_before < CUT_GAP_S:
            continue
        for b in range(a, len(words)):
            if b > a and words[b]["start"] - words[b - 1]["end"] > HARD_GAP_S:
                break  # a long pause inside: the line would span two moments
            length = words[b]["end"] - words[a]["start"]
            if length > LINE_MAX_S:
                break
            gap_after = words[b + 1]["start"] - words[b]["end"] if b + 1 < len(words) else math.inf
            ends_sentence = re.search(r"[.?!]$", words[b]["text"]) and not words[b]["text"].endswith("...")                 and not TITLE_RE.match(words[b]["text"])
            if ends_sentence and gap_after >= CUT_GAP_S and length >= min_s and b - a + 1 >= min_words:
                out.append({
                    "words": words[a:b + 1],
                    "prev_end": words[a - 1]["end"] if a else -math.inf,
                    "next_start": words[b + 1]["start"] if b + 1 < len(words) else math.inf,
                })
    return out


def snap(line, speech):
    """Moves a line's cuts to where the voice detector hears its speech start and stop. Whisper's word times
    can run into a roar before the first word, or stop inside the last one. None if it hears no speech there."""
    start, end = line["words"][0]["start"], line["words"][-1]["end"]
    hits = [s for s in speech if s[1] > start - 0.2 and s[0] < end + 0.2]
    if not hits:
        return None
    heard = sum(min(e, end) - max(s, start) for s, e in hits if min(e, end) > max(s, start))
    if heard < MIN_SPEECH_SHARE * (end - start):
        return None
    first_word_end, last_word_start = line["words"][0]["end"], line["words"][-1]["start"]
    speech_start = min(max(hits[0][0], line["prev_end"] + 0.05), first_word_end - 0.05)
    speech_end = max(min(hits[-1][1], line["next_start"] - 0.05), last_word_start + 0.05)
    return {
        "speech_start": speech_start,
        "speech_end": speech_end,
        "cut_start": max(speech_start - PAD_BEFORE_S, line["prev_end"] + 0.02, 0),
        "cut_end": min(speech_end + PAD_AFTER_S, line["next_start"] - 0.02),
    }


def score_line(line, voice, rest):
    ws = line["words"]
    start, end = line["speech_start"], line["speech_end"]
    length = end - start
    probs = [w["p"] for w in ws]
    a, b = int(start * RATE), int(end * RATE)
    purity = 20 * math.log10((rms(voice[:, a:b]) + 1e-9) / (rms(rest[:, a:b]) + 1e-9))
    return {
        "length": length, "mean_p": float(np.mean(probs)), "min_p": float(min(probs)), "purity_db": purity,
        "words_per_s": len(ws) / length,
        "score": 2 * float(np.mean(probs)) + min(max(purity, -10), 20) / 20 - abs(length - LINE_TARGET_S) / 3,
    }


def fade(x, fade_in, fade_out):
    x = x.copy()
    n_in, n_out = int(fade_in * RATE), int(fade_out * RATE)
    if n_in:
        x[:n_in] *= np.sin(np.linspace(0, np.pi / 2, n_in)) ** 2
    if n_out:
        x[-n_out:] *= np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2
    return x


def level(x, speech):
    """Speech at about -20 dBFS RMS, peaks no higher than -1 dBFS."""
    gain = 10 ** (-20 / 20) / (rms(speech) + 1e-9)
    peak = np.max(np.abs(x)) * gain
    if peak > 10 ** (-1 / 20):
        gain *= 10 ** (-1 / 20) / peak
    return x * gain


def similar(a, b):
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def same_line(a, b):
    """Two lines are one if they read alike or share a run of 4 words: the same scene often turns up
    in several videos, cut a little differently each time."""
    wa, wb = normalize(a), normalize(b)
    run = difflib.SequenceMatcher(None, wa, wb, autojunk=False).find_longest_match(0, len(wa), 0, len(wb)).size
    return run >= 4 or similar(a, b) > 0.6


def mouth_track(voice, ref):
    """The voice's syllables, one digit per frame from 0 (shut) to 9 (wide open), so the characters move to the
    words alone, never to the bed under them. Loudness is measured against its own floor and peak nearby, so
    the mouth snaps shut between syllables even in loud, fast speech; near-silence is always shut."""
    from scipy.ndimage import maximum_filter1d, minimum_filter1d

    frame = RATE // MOUTH_FPS
    loud = np.array([rms(voice[i:i + frame]) for i in range(0, voice.size, frame)])
    floor, peak = minimum_filter1d(loud, size=7), maximum_filter1d(loud, size=13)  # about 0.3 and 0.5 s
    shape = np.clip((loud - floor) / (peak - floor + 1e-9), 0, 1)
    shape[loud < 0.15 * ref] = 0
    return "".join(str(int(v)) for v in np.round(shape * 9))


CONTRACTIONS = [("won't", "will not"), ("can't", "can not"), ("n't", " not"), ("'ll", " will"), ("'re", " are"),
                ("'m", " am"), ("'ve", " have"), ("'d", " would")]


def plain_words(text):
    """Words for matching a line with a quote, so "I'll never let go" and "I will never let go" read alike."""
    out = []
    for w in normalize(text):
        for short, full in CONTRACTIONS:
            if w.endswith(short):
                w = full if not short.startswith(("'", "n")) else w[: -len(short)] + full
                break
        out.extend(w.split())
    return out


def overlap(line_words, quote_words):
    """(share of the quote, share of the line) that one unbroken run of shared words covers."""
    if not line_words or not quote_words:
        return 0.0, 0.0
    run = difflib.SequenceMatcher(None, line_words, quote_words, autojunk=False).find_longest_match(
        0, len(line_words), 0, len(quote_words)).size
    return run / len(quote_words), run / len(line_words)


def iconic_score(line, video, signals):
    """How iconic a line is, from signals that need no judgment of taste:
    - the video's title quotes it, up to 1.5 ("King of the World" Clip), and Wikiquote has it, up to 1.2 for a
      famous quote (bolded, or a picture's caption) and 0.5 for any other. Both only count in full when the
      quote is most of the line, so a long line that merely contains a scene's name scores low.
    - YouTube's most-replayed curve peaks on it (up to 0.6) and its video is among the film's most watched (up
      to 0.8): a famous scene has the most views.
    Only the first two say what was said, so a line needs one of them to count as iconic (see ICONIC_FLOOR)."""
    words = plain_words(line["text"])
    info = signals["videos"][video] if video < len(signals["videos"]) else None
    parts = {"title": 0.0, "quote": 0.0, "replay": 0.0, "views": 0.0}

    def match(quote_words, weight, least):
        of_quote, of_line = overlap(words, quote_words)
        if of_quote * len(quote_words) < min(least, len(quote_words)):
            return 0.0
        return weight * min(of_quote, 1.0) * min(1.0, of_line / 0.7)

    if info:
        for q in quoted(info["title"]):
            parts["title"] = max(parts["title"], match(plain_words(q), 1.5, 2))
        heat = info["heatmap"]
        if heat:
            values = sorted(h[2] for h in heat)
            median, top = values[len(values) // 2], values[-1]
            mid = (line["speech_start"] + line["speech_end"]) / 2
            here = max((h[2] for h in heat if h[0] - 1 <= mid <= h[1] + 1), default=median)
            parts["replay"] = 0.6 * max(0.0, (here - median) / (top - median + 1e-9))
        views = [math.log10(v["views"] + 1) for v in signals["videos"] if v]
        if len(views) > 1 and max(views) > min(views):
            parts["views"] = 0.8 * (math.log10(info["views"] + 1) - min(views)) / (max(views) - min(views))
    for quote, famous in signals["quotes"]:
        qw = plain_words(quote)
        # A famous quote may be a long speech: a line that is most of the quote counts, and so does a whole
        # sentence of a speech, but only a real sentence (5 words or more), not "And it was."
        of_quote, of_line = overlap(words, qw)
        run = round(of_quote * len(qw))
        if of_line >= 0.8 and (of_quote >= 0.5 and run >= min(2, len(qw)) or run >= 5):
            parts["quote"] = max(parts["quote"], (1.2 if famous else 0.5) * max(of_quote, 0.8 * of_line) ** 0.5)
    total = sum(parts.values())
    return (total if parts["title"] + parts["quote"] > 0 else 0.0), parts


def snap_loose(line):
    """Cuts from Whisper's word times alone, for an iconic line the voice detector doesn't hear well: famous
    lines are often shouted over music, where it fails."""
    start, end = line["words"][0]["start"], line["words"][-1]["end"]
    return {
        "speech_start": start,
        "speech_end": end,
        "cut_start": max(start - 0.12, line["prev_end"] + 0.02, 0),
        "cut_end": min(end + 0.2, line["next_start"] - 0.02),
    }


def make_clip(line, voice, rest, d, min_match=0.75):
    """Cuts a line into an MP3, with the rest of the soundtrack as a quiet bed, then listens back: a clip
    Whisper doesn't hear as the same line is deleted and the line skipped."""
    bed = 10 ** (BED_DB / 20)
    speech = voice[int(line["speech_start"] * RATE):int(line["speech_end"] * RATE)]
    # The loud end of the line's syllables is a full-open mouth.
    frame = RATE // MOUTH_FPS
    ref = np.percentile([rms(speech[i:i + frame]) for i in range(0, max(1, speech.size - frame), frame)], 90)
    a, b = int(line["cut_start"] * RATE), int(line["cut_end"] * RATE)
    samples = level(fade(voice[a:b] + bed * rest[a:b], 0.03, 0.08), speech)
    line_id = new_id(8)
    file = d / "clips" / f"{line_id}.mp3"
    encode_mp3(samples, file)
    heard = " ".join(w["text"] for s in transcribe(decode(file, 16_000, 1)[0]) for w in s["words"])
    if similar(heard, " ".join(w["text"] for w in line["words"])) < min_match:
        file.unlink()
        return None
    return {"id": line_id, "clip": {"file": str(file.relative_to(d)), "seconds": round(samples.size / RATE, 3),
                                    "mouth": mouth_track(fade(voice[a:b], 0.03, 0.08), ref)}}


def voice_print(voice_mono, start, end):
    if "ecapa" not in _models:
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy

        _models["ecapa"] = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb", savedir=str(LAB / "models" / "ecapa"),
            run_opts={"device": "cuda"}, local_strategy=LocalStrategy.COPY)
    import torch
    from scipy.signal import resample_poly

    clip = resample_poly(voice_mono[int(start * RATE):int(end * RATE)], 16_000, RATE).astype(np.float32)
    with torch.no_grad():
        e = _models["ecapa"].encode_batch(torch.from_numpy(clip)[None].to("cuda"))[0, 0].cpu().numpy()
    return e / (np.linalg.norm(e) + 1e-9)


def label_voices(lines):
    """Groups a film's candidate lines by voice, then keeps only voices heard in a scene clip: a trailer's
    narrator is in no scene, so his lines go, while a character's lines from a trailer may stay. The voices
    with the most distinct scene-clip lines (a repeated scene counts once) are the main characters: the top
    one and any with at least MAIN_SHARE of its lines. Returns the lines that are kept."""
    from scipy.cluster.hierarchy import fcluster, linkage

    in_clips = [l for l in lines if l["from_clip"]]
    if not in_clips:
        return []
    if len(lines) < 2:
        groups = [1] * len(lines)
    else:
        prints = np.stack([l["print"] for l in lines])
        groups = fcluster(linkage(prints, method="average", metric="cosine"), t=SAME_VOICE, criterion="distance")
    distinct = {}
    for l, g in zip(lines, groups):
        if l["from_clip"]:
            kept = distinct.setdefault(g, [])
            if not any(same_line(l["text"], k) for k in kept):
                kept.append(l["text"])
    top = max(len(v) for v in distinct.values())
    heard = []
    for l, g in zip(lines, groups):
        if g in distinct:
            l["voice"] = "main" if len(distinct[g]) >= MAIN_SHARE * top else "side"
            l["group"] = int(g)
            heard.append(l)
    return heard


def candidate_key(line):
    return f"v{line['video']}@{line['speech_start']:.2f}"


def judged_order(d, iconic):
    """The iconic lines, most iconic first. Writes the best few, one per wording, to iconic-candidates.json for a
    Claude Code agent to rank by how famous each line is; once it has written iconic-judged.json ({"order": [keys,
    most iconic first]}), its order wins and the lines it left out go. Without a judgment, the signals' order."""
    unique = []
    for line in iconic:
        if not any(same_line(line["text"], u["text"]) for u in unique):
            unique.append(line)
        if len(unique) == ICONIC_CANDIDATES:
            break
    write_json(d / "iconic-candidates.json", [
        {"key": candidate_key(l), "text": l["text"], "iconic": round(l["iconic"], 2),
         "signals": {k: round(v, 2) for k, v in l["signals"].items()}} for l in unique])
    judged = d / "iconic-judged.json"
    if not judged.exists():
        return unique
    by_key = {candidate_key(l): l for l in unique}
    return [by_key[k] for k in read_json(judged)["order"] if k in by_key]


def lines_step(slug, meta, d, videos):
    path = d / "lines.json"
    if path.exists():
        return read_json(path)
    forbidden = title_rule(meta["title_names"])
    signals = signals_step(meta, d)
    audio, scored = {}, []
    for video in videos:
        voice_path, rest_path, analysis = stems_step(video, d)
        voice, rest = sf.read(voice_path, dtype="float32")[0].T, sf.read(rest_path, dtype="float32")[0].T
        audio[video[0]] = (voice.mean(0), rest.mean(0))
        for line in candidate_lines(analysis["segments"], ICONIC_MIN_S, ICONIC_MIN_WORDS):
            text = " ".join(w["text"] for w in line["words"])
            if says_forbidden(text, forbidden):
                continue
            line["text"] = text
            cuts = snap(line, analysis["speech"])
            if not cuts:
                # The voice detector misses shouting over music: a line with a strong iconic signal is cut from
                # Whisper's word times instead.
                line.update(snap_loose(line))
                if iconic_score(line, video[0], signals)[0] < ICONIC_FLOOR:
                    continue
            else:
                line.update(cuts)
            s = score_line(line, voice, rest)
            iconic, parts = iconic_score(line, video[0], signals)
            ordinary_cut = cuts is not None
            # Clear speech, not sung lyrics (held notes make few words per second) or mumbles. An iconic line may
            # be shorter and rougher, but is still never a mumble.
            ordinary = (s["mean_p"] >= 0.65 and s["min_p"] >= 0.25 and s["words_per_s"] >= 1.6
                        and s["purity_db"] >= MIN_PURITY_DB and s["length"] >= LINE_MIN_S and len(line["words"]) >= 3
                        and ordinary_cut)
            rough_ok = s["mean_p"] >= 0.5 and s["min_p"] >= 0.1 and s["purity_db"] >= MIN_PURITY_DB - 4
            if not ordinary and not (iconic >= ICONIC_FLOOR and rough_ok):
                continue
            line["from_clip"] = meta["videos"][video[0]]["type"] == "Clip"
            if line["from_clip"]:
                s["score"] += CLIP_BONUS
            line["print"] = voice_print(audio[video[0]][0], line["speech_start"], line["speech_end"])
            scored.append({**line, **s, "video": video[0], "ordinary": ordinary,
                           "iconic": iconic if iconic >= ICONIC_FLOOR else 0.0, "signals": parts})

    scored = label_voices(scored)
    for line in scored:
        line["score"] += MAIN_BONUS * (line["voice"] == "main")
    result = []

    def clashes(line, unique_voice):
        for r in result:
            other = r["line"]
            if other is line or same_line(line["text"], other["text"]):
                return True
            if unique_voice and r["role"] == "ordinary" and other["group"] == line["group"]:
                return True
            if (other["video"] == line["video"] and line["cut_start"] < other["cut_end"]
                    and other["cut_start"] < line["cut_end"]):
                return True
        return False

    def take(pool, role, unique_voice, min_match=0.75):
        for line in pool:
            if not clashes(line, unique_voice):
                files = make_clip(line, *audio[line["video"]], d, min_match)
                if files:
                    result.append({"line": line, "files": files, "role": role})
                    return True
        return False

    # The iconic lines first, so the ordinary ones can't use them up: the best few, any voice (a lead may well
    # have two famous lines). The rest of the board is ordinary lines, one per voice, from side characters to leads.
    iconic = sorted((l for l in scored if l["iconic"]), key=lambda l: -(l["iconic"] + 0.2 * l["score"]))
    iconic = judged_order(d, iconic)
    for _ in range(LINES_PER_FILM - ORDINARY_LINES):
        if not take(iconic, "iconic", False, 0.6):
            break
    plain = sorted((l for l in scored if l["ordinary"] and not l["iconic"]), key=lambda l: -l["score"])
    for voice in ("side", "main", "side", "main", "side"):
        if len(result) >= LINES_PER_FILM:
            break
        take([l for l in plain if l["voice"] == voice] or plain, "ordinary", True)

    def order(r):
        line = r["line"]
        if r["role"] == "iconic":
            return (1, -iconic.index(line), 0)  # the most iconic (first in the pool) opens last
        return (0, line["voice"] == "main", line["score"])

    out = [{"slot": slot, "id": r["files"]["id"], "role": r["role"], "video": r["line"]["video"],
            "video_key": meta["videos"][r["line"]["video"]]["key"], "start": round(r["line"]["cut_start"], 2),
            "text": r["line"]["text"], "voice": r["line"]["voice"], "group": r["line"]["group"],
            "score": round(r["line"]["score"], 3), "iconic": round(r["line"]["iconic"], 3),
            "signals": {k: round(v, 2) for k, v in r["line"]["signals"].items()},
            "purity_db": round(r["line"]["purity_db"], 1), "clip": r["files"]["clip"]}
           for slot, r in enumerate(sorted(result, key=order))]
    write_json(path, out)
    return out


# ------------------------------------------------------------------------------------------------------------------

def build(slug, tmdb_id):
    d = WORK / slug
    meta = meta_step(slug, tmdb_id, d)
    videos = download_step(slug, meta, d)
    clips = sum(meta["videos"][i]["type"] == "Clip" for i, _ in videos)
    if clips < MIN_CLIPS:
        log(slug, f"only {clips} scene clips: no way to tell a trailer narrator from the cast, so no board")
        return
    lines = lines_step(slug, meta, d, videos)
    iconic = sum(l["role"] == "iconic" for l in lines)
    log(slug, f"{len(videos)} videos, {len(lines)} lines ({iconic} iconic)")
    theme_step(slug, meta, d, log)


if __name__ == "__main__":
    picks = read_json(WORK / "picks.json")
    wanted = set(sys.argv[1:])
    for pick in picks:
        if not wanted or pick["slug"] in wanted:
            build(pick["slug"], pick["tmdb_id"])
