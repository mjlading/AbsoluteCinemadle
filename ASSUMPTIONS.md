# Assumptions

Decisions taken where the owner's briefs are ambiguous or silent.
Each entry says what was decided and why, so it can be revisited.

## General

- The site is named "Absolute Cinemadle", after the repository folder.
- Package manager is npm, because pnpm is not installed and npm needs no extra setup.
- Drizzle is the ORM: typed schema in TypeScript, plain SQL migrations, works with any Postgres.
- Local development uses Postgres in Docker; production uses Neon through its Vercel integration.
- The home page is a gallery of the three games: Close-Ups, Casting call and Soundbytes.
- The first game, a daily grid with a back-translated-titles warm-up and a barcode bonus round, was retired on 2026-11-10 with its admin editor, LLM helpers and tables; `/daily` redirects home.
- All animations collapse to an instant change when the player's device asks for reduced motion.

## Puzzle days and answer protection

- A puzzle day is the player's local calendar date (`YYYY-MM-DD`), sent by the client.
  The server refuses dates later than the current UTC date plus one day, since local dates run from UTC-12 to UTC+14 and anything later would be peeking at a future puzzle.
- Guesses are checked by the server; the answer only reaches the client once the game is over.
- Solution routes answer at any time, because whether a game is over is only known in the browser.
  Calling one directly is the same as giving up, so it only spoils the caller's own game.
- Progress lives in localStorage, so a determined player can only cheat their own result, which is acceptable without accounts.
- Pictures go through our own image routes under opaque ids and are cropped on the server, so a full frame or a TMDB path never reaches the browser before it is earned.

## Guessing films

- A guess counts if it is the film picked from the suggestions, or a typed English or original title.
  Typed titles ignore case, accents, punctuation and a leading "The", "A" or "An", allow one typo from 8 characters and two from 14, and must have the same sequel number.
- Suggestions come from a public, cached TMDB title search; they only echo what the player typed.
  They are reordered so titles starting with the typed text come first, then titles with a word that does, each by TMDB vote count, since the search ranks partial words oddly.

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
- Guesses match as in "Guessing films" above.
- "Enhance" is free and once per game: it widens one close-up by 50%, rendered on the server like every crop.
- There are no toasts or rules sentences on the game screen; a polite live region tells screen readers about misses, skips, repeats and Enhance.
  The `?` dialog is the only rules text and opens by itself on a first visit (remembered under `close-ups:help-seen`).
- At the end every keyword's collage can be viewed from the strip, the unopened ones too, and each close-up zooms out to its full frame (letterboxed in its square).
  Full frames come from the solution route, which only spoils the caller's own game.
- The share text is `Close-Ups #<number> <score>/6` and one square per keyword (red used, green solved, black not reached).
- Collage tiles are rendered from TMDB on each request and cached by the browser for 30 days; a new export makes new tile ids.
- Collage puzzles are TMDB data: `collage_puzzles.synced_at` dates them, and they must be re-exported or deleted within 6 months.
- Progress is saved per puzzle in localStorage under `close-ups:<id>`.
- Each puzzle has an optional, unique date; only dated puzzles are shown, so the undated demos are hidden, not deleted.
  A player gets the puzzle for their own local date (see "Puzzle days and answer protection").
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

## Development and tests

- E2E tests run against a production build and a separate `cinemadle_test` database; each run imports the Close-Ups and Soundbytes fixtures for today.
- Every E2E test runs on desktop; on a phone only those tagged `@phone` (layout, touch and whole games) run, since the rest check logic that doesn't change with the screen.
- Tests that need TMDB skip themselves when no `TMDB_READ_ACCESS_TOKEN` is available.

## Casting call

- The game is called "Casting call" and lives at `/casting-call`.
  It became a daily on 2026-11-14, at the owner's request: `/casting-call` is today's board, `/casting-call/<date>` an earlier day and `/casting-call/archive` the list, like the other two dailies.
- It shares their numbering (the owner's choice): #1 is 2026-11-10. The daily went in on #5, and the owner asked for #1 to #4 too, so the cron job builds every missing day from #1 on (players can't, since they may only cause today's board to be built).
- Boards build themselves with no computer of the owner's switched on (the owner's requirement): by a daily Vercel Cron job, or on a day's first visit when the job hasn't run.
  An LLM was considered and left out: building and checking a board is plain logic over TMDB data, and keyed APIs need the owner's approval.
  A player may only cause a board to be built for a day that is today somewhere on Earth, so the past and future can't be filled by request.
- The owner wants obscure films and well-known actors: boards group well-known actors through lesser-known films they share (see "Daily boards" in docs/CASTING-CALL.md for the thresholds).
  The owner asked for groups of 3+3+2 most days instead of always 4 pairs, and for those boards to be clearable in pairs as well where possible.
- The best route (the board's 3 or 4 films) is shown when the game ends, won or lost (the owner's request), from its own route, since the names route is called at Start.
- The six fixed boards were retired from the app and kept in `tools/casting-call/legacy-boards.json`; their old addresses redirect to today's board.
- Faces are blurred before Start and names are not sent at all; the names are only fetched when Start is pressed, so the clock is running once they're known. The blur is CSS only, so the picture itself is still reachable by someone digging in the browser, which only spoils their own game.
- The 5-guess limit stayed when the 40-second bar was added; the owner's brief for the bar didn't remove it.
  The owner raised it to 6 on 2026-11-14, after playtests of the daily found it hard.
- A film refills the bar if anyone from the board is in it, including actors already crossed out; a film with nobody from the board doesn't.
- The bar keeps running across a reload, since its deadline is saved; time spent waiting for the server to check a film isn't charged.
- Any credited role in a film counts, however small: the player named a film the actor is in.
- Names are TMDB's spelling of the person, not the film's credit, and actors are matched by TMDB person id.
- A guess that finds nobody new still uses a guess.
- Firing an actor (once a game, taking them off the board without a guess) was tried on 2026-11-14 and dropped by the owner the same day.
- There are no points: the result is the number of guesses used, so nothing needs adding to `scoring.ts`.
- Progress is saved per board in localStorage under `casting-call:<id>`, so a reload resumes; the archive shows "Solved in N" or "Missed".
  Games saved on the old fixed boards are simply never read again.
- Faces are 320-pixel squares cropped from the top of the TMDB profile photo, cached for a day.
- A board must need as many films as it has groups, counting every film its actors are credited in, so even a collage film like "Final Cut: Ladies and Gentlemen" can't make one easy.
- Boards keep only TMDB ids; the cron job re-fetches the people on boards older than 5 months and dates them again, and deletes a board whose people TMDB no longer has.
