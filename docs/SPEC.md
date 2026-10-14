# Absolute Cinemadle - product spec

Original brief from the project owner, kept as the source of truth.
Where it is ambiguous, the decision taken is recorded in [ASSUMPTIONS.md](../ASSUMPTIONS.md).

## Owner constraints (added at kickoff, 2026-10-14)
- LLM calls use the cheapest Anthropic model.
  The owner asked for "Haiku 5.5", which does not exist, so `claude-haiku-4-5` is used.
- Total LLM spend is capped at USD 10, enforced in code.
- Any other paid or keyed API must be raised with the owner before it is used.

## Overview
Build a mobile-first daily movie puzzle game with three rounds per day, taking a player about 5–10 minutes total:

1. **Warm-up - Back-translated titles:** guess films from foreign release titles translated literally back into English.
2. **Main round - Visual grid:** a 4×4 Connections-style grid of 16 image tiles.
   The tiles form 4 hidden groups of 4, and each group belongs to one film.
3. **Bonus round - Barcode match:** match 4 color "barcodes" to the 4 films from the main grid.

Everyone gets the same puzzle each day.
Puzzles are hand-curated in an admin editor, not auto-generated.

## Tech stack (defaults; change only with good reason)
- Next.js (App Router) + TypeScript + Tailwind CSS
- Postgres (Supabase is fine) for puzzles and content; localStorage for player progress and streaks (no player accounts in v1)
- TMDB API for film metadata, cast, headshots, stills and foreign titles.
  Call it only from the server so the API key never reaches the client.
- YouTube IFrame Player API for sound hints

## Round 1: Warm-up (back-translated titles)
- 5 titles, 60-second timer for the whole round.
- Each card shows the foreign title, its language/country and the literal English back-translation.
- The player types the real English title, with autocomplete from TMDB search and fuzzy matching (ignore case, punctuation and leading "The").
- Warm-up films must NOT overlap with the day's grid films.
- Skipping is allowed; skipped and unanswered titles are revealed at the end of the round.

## Round 2: Main grid
- 16 tiles in random order, each with one of four tile types:
  - `headshot`: actor photo (TMDB profile image)
  - `still`: a frame from the film (TMDB backdrop)
  - `empty_set`: a still with no people visible, so location, lighting and color grade are the only clues
  - `prop`: a tight crop of a still showing an object or costume detail
- Each group contains exactly 4 tiles from one film.
  The mix of tile types within a group VARIES.
  Never enforce one of each type, or players can solve by elimination.
- Each group has a difficulty tier (1–4) shown by color on reveal.
  Use an original palette, not NYT Connections colors.
- Interaction: tap to select up to 4 tiles, then Submit.
  Show a "one away" message when 3 of 4 are correct.
  Allow 4 mistakes before the round ends and all remaining groups are revealed.
- On a correct group, the 4 tiles collapse into a banner showing the film title and year.
- Tile flip: every tile starts image-only.
  The player can flip a tile to reveal its label (actor name, or a short description like "prop" or "location") at a point cost.
- Long-press or a zoom button enlarges a tile, since images are small on phones.
- Sound hint (max 2 per day): plays a ~2-second window from an official trailer or clip of a random unsolved film, using YouTube embed start/end times.
  - Do NOT download, rehost or extract audio.
  - Check YouTube's API terms on player visibility and minimum size.
    If audio-only or hidden playback isn't allowed, show the player visibly for the 2 seconds and treat it as a stronger hint.

## Round 3: Bonus (barcode match)
- Show the 4 barcodes and the 4 films from today's grid (revealed even if the player failed the grid).
  The player drags or taps to match them.
- Barcode generation: true movie barcodes need the full film, which we won't use.
  Instead:
  - Build a "palette strip" from the film's TMDB backdrops: one vertical band per image using its dominant color (k-means or similar), sorted by hue for a pleasing gradient.
    Precompute these on the server and cache them.
  - Also allow the admin to upload a custom barcode image per film to override the generated one.

## Scoring and results
- Keep all point values in one config file, e.g.:
  - grid base 100, −10 per mistake, −5 per flip, −15 per sound hint
  - +10 per warm-up title, +10 per correct barcode match
- Results screen: total score, per-round breakdown, streak, and a shareable spoiler-free text summary (emoji rows showing the solve order and mistakes, like Connections/Wordle).
  Use a copy-to-clipboard button.
- A new puzzle unlocks at local midnight.
  Save progress so a refresh resumes mid-game.

## Admin puzzle editor (password-protected route)
- Film search through TMDB; choose 4 films and assign difficulty tiers.
- For each film, browse its cast headshots and backdrops in a picker:
  - Pick an image as a `headshot`, `still` or `empty_set` tile.
  - Use a crop tool on any backdrop to create a `prop` tile (store crop coordinates and render the crop, rather than saving a new image).
  - TMDB often has multiple profile photos per actor.
    Let the admin choose, so headshots can be age-matched to the film's era.
- **Red-herring helper:** show actors who appear in more than one of the 4 chosen films, plus other films sharing a director or cast.
  This helps the curator design deliberately misleading tiles.
- Warm-up builder:
  - Pull a film's foreign titles from TMDB's translations/alternative-titles endpoints.
  - Generate literal (word-for-word, not natural) back-translation candidates with an LLM API call.
  - The admin edits and approves them.
    Store the foreign title, language, literal translation and answer.
- Sound hint setup: paste a YouTube URL and set the start/end seconds, with a preview button.
- Barcodes: preview the generated palette strip, with an upload override.
- Preview the full puzzle exactly as a player sees it, then schedule it to a date.
  Warn if any date in the next 14 days has no puzzle.
- Validation before scheduling:
  - exactly 16 tiles, 4 per film
  - no duplicate images
  - 5 warm-up titles that don't overlap the grid films
  - barcodes present for all 4 films

## Data model (suggested)
- Film: tmdbId, title, year
- Tile: id, puzzleId, filmId, type, imageUrl, crop (nullable), label
- Puzzle: date, 4 films with difficulty, 16 tiles, 5 warm-up entries, 4 barcodes, sound hints [{filmId, youtubeId, start, end}]

## Constraints
- Images come from TMDB under its terms: show the required TMDB attribution in the footer, and check whether the current terms allow our intended use (non-commercial vs. commercial).
- Never host or stream film video or audio files ourselves.
- Accessibility:
  - Full keyboard play and good contrast.
  - Tile alt text must NOT reveal answers.
    Use alt text like "Tile 7, prop close-up", not the actor's name.
  - Flipping a tile reveals its label to screen readers as well.
- Never expose answers in the client payload before they're earned.
  Validate guesses server-side, or obfuscate the group mapping.

## Build phases
Finish each phase in a playable state before starting the next.

1. Main grid only, using a hardcoded JSON puzzle with placeholder images.
   Covers selection, submit, mistakes, "one away", reveal banners and tile flipping.
   **Stop and check in with the owner after this phase.**
2. Database, admin editor and TMDB integration; puzzles are loaded by date.
3. Warm-up round, including the LLM back-translation flow in the admin.
4. Bonus barcode round and palette-strip generation.
5. Sound hints, scoring, results and share text, streaks, and progress persistence.

Stretch goals (do not build unless asked):
- AI inpainting to remove people from stills for `empty_set` tiles
- An archive of past puzzles
- Head-to-head mode

If something is ambiguous, choose a sensible default, note it in ASSUMPTIONS.md, and keep going.
Only stop to ask if truly blocked.
