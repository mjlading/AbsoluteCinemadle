# Soundbytes lab

The audio pipeline for Soundbytes (see "Audio sources" in [docs/SOUNDBYTES.md](../../docs/SOUNDBYTES.md)).
It runs on the owner's PC, never on Vercel: it downloads official videos, so it must never run on the server.
Everything is automatic; nothing is picked by hand.

## Set up

Needs Python 3.12+, an NVIDIA GPU, Node (yt-dlp uses it to read YouTube), and `TMDB_READ_ACCESS_TOKEN` in the repo's `.env.local`.

```sh
cd tools/soundbytes-lab
python -m venv .venv
.venv/Scripts/activate   # or: source .venv/bin/activate
pip install -r requirements.txt
pip install --force-reinstall --no-deps torch==2.11.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu128
```

Install torch last: the other packages pull in a CPU-only build, and cu128 or newer is needed for RTX 50-series cards.
ffmpeg comes with the `imageio-ffmpeg` package. The first run downloads the separation, Whisper and voice-print models (about 3 GB) into `models/`.

## Run

```sh
python pick.py 3        # picks well-known films at random as new board-N slugs, without printing them
python build.py         # builds every pick (or name slugs: python build.py board-2); about 6 minutes a film
python export.py        # -> .data/soundbytes/boards.json and clips/ (gitignored)
# then, from the repo root, one board a day from a date: npm run db:import-soundbytes -- .data/soundbytes/boards.json --from=2026-11-12
python review.py        # a page with each built board's lines in order, roles and signals (spoils the films)
python listen.py test-1 # a page comparing bed levels for a film you know
# serve either page with the "soundbytes-listen" launch config
```

For a live board, run the import with the production `DATABASE_URL`.
Soundbytes is a daily: the import replaces boards with the same id or date and leaves the rest, and boards imported without `--from` stay undated, which players never see.
To try a film you already know, add `{"slug": "test-1", "tmdb_id": 329}` to `work/picks.json`; `test-` slugs are left out of exports unless named.

## Pipeline

Per film, in `work/<slug>/`, each step is skipped when its output exists (delete it to redo the step):

1. `meta.json`: TMDB details and the film's official English YouTube videos: up to 10 scene clips, then up to 3 trailers.
   Scene clips are the film's own sound; trailers add a narrator, so their lines score lower, only fill in, and only count from voices also heard in a scene clip (see step 5).
   A film with fewer than 4 scene clips gets no board, since its trailers can't be checked; `pick.py` only picks films with enough.
   It also keeps the film's title names (title, original title, collection), the only thing a clip must never say.
2. `videos/`: the audio of each video, downloaded with yt-dlp.
3. `stems/<model>/`: a Mel-Band RoFormer vocals model (via audio-separator) splits each video into the voice and the rest; Silero VAD finds where the voice really speaks, and Whisper (`turbo`) transcribes it with word timestamps.
4. `signals.json` (`signals.py`): what makes a line iconic, with no key needed: each video's title (official clips are often named after their famous line, "King of the World"), view count and YouTube's most-replayed curve, and the film's Wikiquote quotes (the famous ones are bolded or picture captions).
5. `lines.json` and `clips/`: the board's 5 lines in the order they open.
   - Lines 1 and 2 are ordinary lines, a side character's then a lead's: whole sentences of 2 to 4.6 seconds with clean silence at both cuts, one per voice.
   - Lines 3 to 5 are the most iconic lines, the most iconic last. A line is iconic when a video title quotes it or Wikiquote has it; the most-replayed peak and the video's views add to its score. Iconic lines may be shorter (from 1 second and 2 words) and rougher than ordinary ones, since famous lines are often shouted over music, and may come from a voice already on the board. With too few, ordinary lines fill in.
   - Dropped: lines saying the title (the whole title, or a part split at a colon, as a phrase; or a title word rare enough to name the film alone, such as "Titanic"), trailer copy ("coming soon"), sung lyrics (too few words a second), mumbles (low Whisper confidence), lines the voice detector barely hears and voices buried more than 6 dB under the rest.
   - Cuts are moved to where the voice detector hears the speech start and stop, since Whisper's times can run into a roar before the first word or stop inside the last one.
   - Each line gets the rest of the soundtrack back at -10 dB as a bed, is levelled and saved as MP3 with no ID3 tags or other metadata.
   - It is transcribed again and dropped unless Whisper hears the same words, which catches cut-off words and bleed.
   - Lines are grouped by voice (ECAPA voice prints). A voice never heard in a scene clip, such as a trailer's narrator, is dropped; of the rest, the voices with the most distinct scene-clip lines are the leads.
   - Each clip gets a mouth track for the characters: the voice alone (no bed), one digit 0 to 9 per 40 ms frame, measured against the voice's nearby floor and peak so the mouth shuts between syllables.

## Judging

The signals find famous lines but can't always tell which is the most famous: a well-watched clip can lift an ordinary line.
So `build.py` writes each film's best iconic lines (up to 12, one per wording) to `work/<slug>/iconic-candidates.json`, and a Claude Code agent ranks them, as the collage lab's curation does (there is no Anthropic API call in the lab):

1. Ask a Claude Code agent to read `iconic-candidates.json` for the film and write `iconic-judged.json` beside it: `{"order": [keys, most iconic first]}`, leaving out lines no fan would know.
2. Delete `lines.json` and `clips/`, and run `build.py` again: the judged order decides which iconic lines the board gets and in which order (the most iconic opens last).

Without a judgment the board uses the signals' order.

6. `theme.json` (`theme.py`): the film's theme, the first iTunes song on a soundtrack album named after the film by its composer, and the loudest 12 seconds of its 30-second preview. The preview is fetched to `theme/` for analysis only; the board plays it from Apple's servers.

`export.py` makes boards of 5 clues: the 2 ordinary lines, the 2 most iconic lines, then the theme ("Line 1" to "Line 4", then "Theme"); a film without a theme keeps its third iconic line.

Downloaded videos, stems and clips are gitignored and stay on this PC; delete `work/` once boards are imported.
Clip sources (video id and time) stay in the database, server-side, so a takedown request can be traced to its clip.
