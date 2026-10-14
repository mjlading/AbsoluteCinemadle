# Assumptions

Decisions taken where [docs/SPEC.md](docs/SPEC.md) is ambiguous or silent.
Each entry says what was decided and why, so it can be revisited.

## General

- The game is named "Absolute Cinemadle", after the repository folder.
- The LLM is `claude-haiku-5-5`, as the owner asked: $0.10 input / $0.50 output per million tokens for prompts up to 100,000 tokens.
- The USD 10 LLM cap is a lifetime cap enforced by a ledger table: before each call, the worst-case cost (input tokens plus `max_tokens` of output) must fit in the remaining budget.
  A spend limit on the Anthropic Console workspace is recommended as a second, independent backstop.
- Package manager is npm, because pnpm is not installed and npm needs no extra setup.
- Drizzle is the ORM: typed schema in TypeScript, plain SQL migrations, works with any Postgres including Supabase.
- Local development uses Postgres in Docker; production uses a Supabase Postgres connection string.

## Puzzle day and answer protection

- A puzzle day is the player's local calendar date (`YYYY-MM-DD`), sent by the client.
  The server refuses dates later than the current UTC date plus one day, since local dates run from UTC-12 to UTC+14 and anything later would be peeking at a future puzzle.
- The solution route answers at any time, because whether a round is over is only known in the browser.
  Calling it directly is the same as giving up, so it only spoils the caller's own game.
- Guesses are checked by a server route that returns only "correct" (with that group's film and tiles), "one away" or "wrong".
  Mistake, flip and hint counts are tracked in localStorage, so a determined player can only cheat their own score, which is acceptable without accounts.
- Tile images go through an image route keyed by an opaque per-tile id, which renders the crop server-side.
  A CSS-only crop would ship the full backdrop to the browser and give the prop away.
- Every TMDB tile, not just props, is a square crop chosen by the admin (centered for stills, from the top for portraits), so players never receive a full frame.
- Tiles are immutable apart from their label: a different picture or crop makes a new tile, so tile images can be cached for 30 days.
  Player tile images are cached publicly; admin preview images are cached privately, so drafts never land in a shared cache.
- Posters on solved banners load straight from TMDB's image CDN, because they only appear once the film is earned.

## Main grid rules

- The round ends on the 4th mistake, as in Connections.
- A "one away" guess counts as a mistake.
- Re-submitting a set already guessed wrong is rejected with an "already guessed" message and costs nothing.
- Flipping a tile costs points once; it stays flipped for the rest of the day.
- Flipping happens in the larger tile view, because a tap already selects and a long press opens that view.
  The revealed label then sits on a strip along the bottom of the tile, so the picture stays visible.
- The number in a tile's alt text ("Tile 7") is its starting position and stays with the tile through shuffles and solves.
- Players can shuffle the remaining tiles, as in Connections.
- Taps are ignored while a guess is being checked or its result is animating.
- Tier colors follow the dyes of color film plus white film-can tape: 1 cyan, 2 yellow, 3 magenta, 4 white.
- A perfect grid means no mistakes; revealed labels do not spoil it.

## Warm-up

- The 60-second clock starts after the 3, 2, 1 film leader; players can also end the round early.
- Skipping sends a card to the back of the queue, so players see every card before returning to skipped ones.
  Cards still unanswered when the round ends are revealed then.
- Guesses are unlimited within the minute and wrong ones cost nothing.
- An answer counts if it is the film picked from the suggestions, or a typed English or original title.
  Typed titles ignore case, accents, punctuation and a leading "The", "A" or "An", allow one typo from 8 characters and two from 14, and must have the same sequel number.
- Suggestions come from a public, cached TMDB title search; they only echo what the player typed.
  They are reordered so titles starting with the typed text come first, then titles with a word that does, each by TMDB vote count, since the search ranks partial words oddly.
- The Guess button sits beside the guess box, so the suggestion list never covers it.
- Cards show the language and country as English names ("Spanish, Mexico").
- A puzzle with no warm-up starts at the grid; only an admin preview can hit that, since scheduling needs 5 cards.
- The warm-up answers route follows the same trust model as the grid solution route.

## Bonus round

- The round opens after the grid, won or lost, with the four films easiest first and their barcodes in a shuffled order.
- Barcode ids are random per puzzle and film, so the pairing can't be worked out from them; the films themselves are no secret by then.
- Players match all four, then check once; every barcode then shows whether it was right and, if not, the right film.
- Barcodes "develop" in as the round opens (pale to full colour) rather than on a correct match, since players need the colours to match them at all.
- A palette strip has one band per backdrop, up to 30, each the largest colour cluster (k-means) of a small thumbnail.
  Near-black and blown-out pixels are ignored unless they fill most of the frame, and clusters closer than a small distance are merged.
  Bands are sorted with near-greys first (dark to light), then by hue in 30-degree slices, dark to light within each.
- Palettes belong to the film and are generated once, when it is first added; uploads belong to one puzzle and replace the strip there.
- Uploaded barcodes are re-encoded as WebP, at most 1600 by 400 pixels; players' browsers may cache one for a day after an admin replaces it.

## Hints

- Players can take up to 2 sound hints and 2 review hints a day (`RULES.grid`), during the grid only.
  Each hint comes from a film they haven't found yet and is never one they already have.
- The films with a given kind of hint are put in a fixed order per puzzle, so everyone gets the same first hint; a hint's place in that order is an opaque token that lets the server skip hints a player already has without the client learning which film a hint is for.
- The hint buttons count down from the daily limit or the number of films with that kind of hint, whichever is smaller.
  When the remaining films have no new hint (because the player solved the others), the player is told so and nothing is charged.
- Hints a player has taken stay in the hint dialog for the rest of the day, so a paid hint can be reread or replayed for free.
- Hints are shown in a dialog over the grid, opened from buttons below the main grid actions.
- YouTube's terms forbid audio-only or hidden playback, overlays and players under 200 by 200 pixels, so the sound hint shows a visible YouTube player (on youtube-nocookie.com), as the spec's fallback allows.
  YouTube's player always shows the video's title and thumbnail, which for most trailers name the film, so the sound hint is in practice a strong hint; the player is told this before paying, and the admin editor asks for videos whose title doesn't name the film where possible.
- The clip is started by our own Play button (scripted playback is allowed while the player is fully visible) or by the player's own button, which some mobile browsers require.
  The window uses YouTube's `start` and `end` player settings, so playback stops by itself; a replay seeks back to the start.
- A sound hint is only charged once its player has loaded, so a clip that can't play costs nothing; a review hint is charged when it arrives.
- Review hints show the reviewer's TMDB name and "on TMDB", with no link, as the owner decided; names of the film, its cast, characters and director are blanked automatically and checked by the admin.

## Scoring, results and sharing

- Every point value lives in `src/config/scoring.ts`; the best possible day is 5 warm-up titles, a clean grid and 4 barcodes.
- The grid's 100 base points are shared out per film found (25 each), so a lost grid still earns points for its solved groups.
  Mistakes, labels and hints are taken off that, and the grid never scores below zero.
- Puzzle numbers count from the launch date in `src/config/site.ts` (#1 on that day).
- The share text has the puzzle number and score, the warm-up as found/missed squares, one row of tier colors per grid guess (as in Connections), the bonus matches, and an icon per hint or revealed label, then the site address.
  It never contains film titles.
- A day joins the player's streak once its results screen opens, whether or not the grid was won.
  The current streak still counts yesterday until midnight, so it doesn't drop to zero before the player has played today.

## Saved progress

- Each round's state is saved in localStorage under the puzzle date, with a signature of the puzzle's card and tile ids; if the admin edits a live puzzle, saved progress for it is dropped.
- A reload resumes the round the player was on.
  The warm-up clock keeps running while the page is closed, the film leader restarts from the intro, and a barcode held mid-match is let go.
- The admin preview never saves progress or touches the streak.

## Admin editor

- There is one admin, signed in with `ADMIN_PASSWORD`; the session is a signed cookie valid for 30 days.
  A wrong password costs 600 ms, which slows guessing without needing shared state between server instances.
- The admin calendar uses UTC dates, a few hours off the owner's local midnight at most.
- Headshots come from TMDB profile photos; stills, empty sets and props come from backdrops, text-free ones first.
- The same picture and crop twice blocks scheduling; two different crops of one picture and identical type mixes in every film are warnings only.
- Puzzles can be scheduled on any date, including past ones, and live puzzles can be edited, with a warning.
- The red-herring helper compares the top 20 billed cast and the directors of the chosen films, and lists the three best-known other films (by TMDB vote count) of each film's directors and top 3 cast.
- Warm-up titles come from TMDB translations (which carry a language) and alternative titles (country only, so the admin sets the language).
  Alternative titles from English-speaking countries are skipped.
- Literal-translation suggestions are only made when the admin asks for them, and the admin always picks or edits the final text.
  Each call reserves its worst-case cost before running; a failed call keeps its reservation, since it may have been billed.
- Film details are re-fetched from TMDB whenever a film is added to a puzzle.
  A periodic refresh of `films` rows older than about 5 months is still needed before launch, to honour TMDB's 6-month limit.

## Animations

- The light table flickers on only the first time a browser opens a given day's puzzle (remembered in localStorage).
- Confetti plays on any win; the "absolute cinema" pictogram only on a perfect one.
- All animations collapse to an instant change when the player's device asks for reduced motion.

## Development and tests

- E2E tests run against a production build and a separate `cinemadle_test` database that is wiped and seeded on each run.
- Admin tests that need TMDB skip themselves when no `TMDB_READ_ACCESS_TOKEN` is available.
