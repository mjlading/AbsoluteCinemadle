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

## Game modes

- The home page is a gallery of game modes; the existing three-round daily puzzle lives at `/daily` and keeps its existing saved-progress keys.
  Shared daily results link directly to that game.
- Close-Ups puzzles live in the `collage_puzzles` table, one row per puzzle with its keywords and tiles as a validated JSON document.
  They are curated in `tools/collage-lab`, exported to a gitignored file and loaded with `npm run db:import-collage`, which replaces them all; there is no admin editor for them yet.
  With no puzzles in the table the page stays a preview.
  The export holds answers and TMDB paths, so it never goes into the public repo.

## Close-Ups

- The game is called "Close-Ups" wherever a player sees it, at `/close-ups`.
  `/keyword-collage` and `/keyword-collage/<id>` redirect there permanently (`next.config.ts`).
  Internal names (`src/lib/collage`, `/api/collage`, the `collage_puzzles` table) stay as they were.
- A puzzle uses exactly 4 keywords in a fixed order, so every player sees the same clues and scores are comparable.
  It was 5 until 2026-11-10; the owner cut it to 4 because too many films could not fill 5 clean keywords.
  Players cannot choose which keyword opens next.
- The order is set on the server when a puzzle is read (`src/lib/collage/order.ts`), so it never depends on how a puzzle was exported: the free keyword first, then hard, medium, easy, keeping the stored order within a tier.
  A puzzle with more keywords loses them from the middle, so the most revealing one always stays last (the owner's rule); dropped keywords' pictures are never served.
- The player has 4 guesses, one per keyword.
  A wrong guess or a Skip uses one and opens the next keyword; the game is lost when they run out.
- The score is `5 - n` for a win on guess _n_, plus 2 for a win on the first guess (6, 3, 2, 1), and 0 for a loss.
  There are no costs: no starting 1000 points, no unlock prices, no price for a wrong guess.
  The numbers live in `scoring.ts` and `rules.ts`; keyword tiers stay in the data for curation and ordering only.
- Guards against losing a guess by accident: Enter in an empty guess box does nothing, so a Skip always takes a press of the Skip button.
  "Give up" on the last keyword needs a second press (the button reads "Give up?" for about 3 seconds).
  There is no separate give-up link; quitting early means skipping to the end.
  While a guess is being checked the Guess button shows a spinner and ignores presses, and a Skip pressed within half a second of a guess settling is ignored, so a double tap on Guess can never become a Skip.
- Repeating a guess (ignoring case, accents and punctuation) is turned away for free, by shaking the guess row and pulsing the matching history chip.
- Guesses match like the warm-up: a film picked from the suggestions, or a typed English or original title with the same typo tolerance.
- "Enhance" is free and once per game: it widens one close-up by 50%, rendered on the server like every crop.
- There are no toasts or rules sentences on the game screen; a polite live region tells screen readers about misses, skips, repeats and Enhance.
  The `?` dialog is the only rules text and opens by itself on a first visit (remembered under `close-ups:help-seen`).
- At the end every keyword's collage can be viewed from the strip, the unopened ones too, and each close-up zooms out to its full frame (letterboxed in its square).
  Full frames come from the solution route, which, like the daily one, only spoils the caller's own game.
- The share text is `Close-Ups <puzzle name> <score>/7` and one square per keyword (red used, green solved, black not reached).
- The home page has no "Daily film puzzle" card until real puzzles exist; the `/daily` route stays.
  The Close-Ups card keeps its "In development" badge until the daily schedule ships.
- Collage tiles are rendered from TMDB on each request and cached by the browser for 30 days, like grid tiles; a new export makes new tile ids.
- Collage puzzles are TMDB data: `collage_puzzles.synced_at` dates them, and they must be re-exported or deleted within 6 months, like `films` rows.
- Progress is saved per puzzle in localStorage under `close-ups:<id>`.
- Each puzzle has an optional, unique date; only dated puzzles are shown, so the undated demos are hidden, not deleted.
  Like the daily grid, a player gets the puzzle for their own local date, and the server refuses any day later than tomorrow in UTC.
- `/close-ups` is always today's game, played or not; a finished game shows its result with a link to the archive, and a missing day says so.
- Close-Ups numbers count from `SITE.closeUpsLaunchDate`; a day before it (a test puzzle) has no number.
- `npm run db:import-collage` replaces stored puzzles with the same id or date and leaves the rest; `--days=0,-1` dates a file's puzzles relative to today, for tests.
  The saved state changed shape, so old `collage:<id>` entries are ignored.
- Pages showing collages carry the line "Film stills belong to their copyright holders."
- The compact footer wraps to about 3 lines at 390 px, because TMDB's attribution wording is fixed.
  That costs nothing there, since the board on a phone is limited by its width, not the height left.

## Soundbytes

- Soundbytes is a daily built like Close-Ups (the owner asked for the same one-screen redesign on 2026-11-10): each dated row of `soundbytes_boards` is one day's board, undated rows are never shown, and the import adds or replaces boards by id or date instead of wiping them, with `--days` for tests.
  Boards live in the `soundbytes_boards` table (dialogue audio in `soundbytes_clips`), imported from the soundbytes lab's export; a day without one says to come back tomorrow.
- Soundbytes numbers count from `SITE.soundbytesLaunchDate`, 2026-11-10: the owner launched it with a week of boards that day, Titanic first.
- Soundbytes has no points, so nothing of it is in `scoring.ts`: the line count (5, and so 5 tries) is in `rules.ts`.
  The owner replaced points and buying with Heardle-style tries after a playtest: buying by holding felt strange.
- A skip is a miss like a wrong guess: it uses a try and opens the next line.
  On the last line it reads "Give up" and asks again ("Give up?"), as in Close-Ups; the held white flag went with the redesign, so there is no way to quit before the last line except skipping.
- A right actor uses no try and opens no line; it is pinned as a hint, and only the film wins (the earlier "3 actors win" rule went with the points).
- Repeating a guess is turned away for free.
- Guesses only count when picked from the suggestions, so the server always knows whether it is a film or a person.
  Suggestions come from TMDB's film and person searches, people limited to actors.
- An actor counts if they are among the film's top-billed cast in the board's answer.
  The answer and cast stay on the server; a guess comes back as right or wrong, with the actor's name for a right one.
- The headphones cover is remembered per board once dismissed; the help dialog and the first-visit hand hint are each remembered once for the whole site, and the hand waits until the help is closed.
- Progress is saved per board in localStorage under `soundbytes:<id>`; its signature includes a save version, so games saved by the points version start fresh.
- The game-over panel is Close-Ups': in place of the guess row, the poster, the film and the line it was named on, with Share and Previous days; the board stays up with every line open.
  Share copies "Soundbytes #3 2/5" and a square per line (red spent, green named, black not reached), as Close-Ups does.
- Misses show under the guess row as Close-Ups' chips (struck-through names, "Skipped"); right actors stay on the board as name tags instead.
- The footer says film clips are short excerpts used for play and gives `contact@absolutecinemadle.fun` for questions and takedowns: an ImprovMX alias forwarding to the owner's inbox, so their own address stays private. The owner does not want the GitHub repo linked from the site (2026-11-10).
- The characters move to the clip's mouth track, made by the lab from the voice alone at 25 frames a second (one digit each), measured against the voice's own nearby floor and peak so the mouth snaps shut between syllables.
  It replaced Web Audio, which heard the soundtrack bed too; plain audio playback also needs no Safari silent-switch workaround.
  A clip without a mouth track gets a made-up speech rhythm.
- The head swings to the other side when the mouth opens on a new syllable, at most every 0.14 s so fast speech doesn't jitter, in 160 ms with a soft overshoot; the mouth and eyes still snap in 70 ms.
  How far it swings follows the voice's loudness, eased over about 0.15 s (`SWAY_S` in `src/lib/soundbytes/mouth.ts`): from about 1 degree on silence to 7 on the loudest words (4.5 for the clapperboard).
- The test board (`e2e/fixtures/soundbytes/boards.json`) plays generated tones from `e2e/fixtures/soundbytes/clips/`, made by `scripts/soundbytes-placeholder-audio.mts`: a buzzy melody for score, a warbling vowel for dialogue and a noise burst for effects, each a 6-second clip, with mouth tracks written into the board file by the same script; the board uses four of the six as lines.
  Its fifth node is a theme on an Apple preview address, which the E2E test serves from `sfx-b.wav` (`page.route`), so no test reaches Apple.
  They are WAV files because the script has no MP3 encoder; the lab's real clips are MP3.
- A board from the lab has 5 lines that get easier (the owner's plan of 2026-11-10, since the game was too hard): a side character's ordinary line, a lead's, then the 2 most iconic lines, the most iconic last, then the theme; a film without a theme gets a third iconic line, and with too few iconic lines, ordinary ones fill in.
- A line is iconic when an official video's title quotes it or the film's Wikiquote page has it (bolded or captioned quotes count most); YouTube's most-replayed peak and the video's view count add to the score but can't make a line iconic alone, since they don't say what was said.
  A title or quote only counts in full when it is most of the line, so "And spit like a man. What, they didn't teach you…" doesn't ride on a clip named "Spit Like a Man", and a line inside a long famous speech must be a sentence of 5 words or more.
  Weights are in `iconic_score` in `tools/soundbytes-lab/build.py`; on Titanic they rank "Iceberg right ahead!", "To make each day count.", "I'm the king of the world!" and "You jump, I jump" on top.
- The theme is the first track iTunes returns for the film's soundtrack album by its composer (theme-like names such as "Main Title" moved a little ahead), and the clue is the loudest 12 seconds of its 30-second preview, played from Apple's servers with a media fragment (`#t=start,end`) and stopped at the window's end on the audio element's time updates, which keep coming in a background tab.
  On the three demo films that gives "My Heart Will Go On", Back to the Future's "Main Title" and the Wonder Woman theme.
- The theme's preview address is in the board payload like the other clips' addresses: an opaque Apple file name, no more of a spoiler than playing a locked line early from the developer tools. The Apple Music link (the track's name) is only sent with the answer.
- Iconic lines may be shorter (1 second, 2 words) and rougher than ordinary ones, and are cut from Whisper's word times when the voice detector misses them, since famous lines are often shouted over music; a voice may have an ordinary and an iconic line.
- Labels are "Line 1" to "Line 5", in the order lines open; voice grouping was too rough for role labels.
- Voices are still grouped (ECAPA voice prints, cosine distance 0.75) to keep trailer narrators out and to favour lead voices.
  A trailer line counts only if its voice is also heard in a scene clip: in the owner's playtest, 4 of Return of the Jedi's 6 lines were its 1983 trailer narrator, who was also the voice with the most lines.
  Leads are counted on scene-clip lines only: every voice with at least half as many as the top one, since films often have two.
  A film needs 4 scene clips (`MIN_CLIPS`): with 2, too few voices are heard to vouch for its trailer lines.
- The bed under each voice is the rest of the soundtrack at -10 dB (`BED_DB` in `tools/soundbytes-lab/build.py`), the owner's pick by ear over -18 dB and the voice alone, which sounds jarring; `listen.py` makes a page to compare levels.
- Dialogue clips are served from `/api/soundbytes/<board>/clips/<clip>` with byte ranges, since Safari plays media only from servers that answer them.
  They may be cached by the browser for good (ids change with every import) but never by the CDN: a shared cache keyed on the URL alone could hand Safari's 2-byte probe to the next player as the whole file.

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
- Palettes belong to the film and are generated once, when it is first added to a grid; uploads belong to one puzzle and replace the strip there.
  Warm-up films never show a barcode, so adding one to the warm-up does not build a palette.
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

## Casting call

- The game is called "Casting call" and lives at `/casting-call`, with a list of boards and one board per page, like Soundbytes; boards are a fixed list in `src/lib/casting-call/boards.ts`.
- Faces are blurred before Start and names are not sent at all; the names are only fetched when Start is pressed, so the clock is running once they're known. The blur is CSS only, so the picture itself is still reachable by someone digging in the browser, which only spoils their own game.
- The 5-guess limit stayed when the 40-second bar was added; the owner's brief for the bar didn't remove it.
- A film refills the bar if anyone from the board is in it, including actors already crossed out; a film with nobody from the board doesn't.
- The bar keeps running across a reload, since its deadline is saved; time spent waiting for the server to check a film isn't charged.
- Any credited role in a film counts, however small: the player named a film the actor is in.
- Names are TMDB's spelling of the person, not the film's credit, and actors are matched by TMDB person id.
- A guess that finds nobody new still uses a guess.
- There are no points: the result is the number of guesses used, so nothing needs adding to `scoring.ts`.
- Progress is saved per board in localStorage under `casting-call:<id>`, so a reload resumes; the board list shows "Solved in N".
- Faces are 320-pixel squares cropped from the top of the TMDB profile photo, cached for a day (face ids are positions, so a board edit reuses them).
- The "no film covers more than two or three actors" aim for boards applies to ordinary films; the 2012 collage film "Final Cut: Ladies and Gentlemen" credits up to five actors on one board, and is left as a lucky find.
