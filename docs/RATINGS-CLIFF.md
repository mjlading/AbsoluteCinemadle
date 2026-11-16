# Ratings Cliff

Design notes for Ratings Cliff, the site's first game about TV series.
It began as one of five prototypes (branch `claude/gifted-babbage-2b5vig`, docs/PROTOTYPES.md there); the owner picked it for the site on 2026-11-16.
Rules decided where the owner is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Ratings Cliff".

## Game

- A daily: one board a day, numbered like the other games (#1 is 2026-11-10), with an archive of earlier days.
  It joined on 2026-11-17 (#8); the days before it were built so the archive starts at #1 like the others'.
- A board is five TV series, one at a time, each shown only as a grid of its episode ratings: a column per season, a row per episode, each cell printing its TMDB rating on a colour for its band (9+, 8.5+, 8+, 7+, 6+, under 6).
  Under the grid: "N seasons, M rated episodes".
- The player picks the series from four names. Each round is picked once; the reveal names the series with its years and one line from the numbers (its best and worst episodes, and a final season that sank or a peak, when there is one).
- One point per series named right, so 0 to 5.
- The end panel lists all five with a green or red square, then the same Share and Previous days buttons as the other games.
  Share copies `Ratings Cliff #8 3/5` and one square per series (green right, red wrong).
- A `?` dialog explains it in three lines and opens by itself on a first visit (remembered under `ratings-cliff:help-seen`).

## Boards

- Built by the server from TMDB (`src/lib/ratings-cliff/build.ts`), stored in `ratings_cliff_boards`, one row per date.
- The daily cron job (`/api/cron/daily`, shared with Casting call) builds every missing board from #1 to a week ahead; a player who reaches today (anywhere on Earth) without a board gets one built on the spot.
  `npm run ratings-cliff:build -- --from=… --to=…` builds a range from a PC, against whatever `DATABASE_URL` points at.
- Series come from about the 200 most-voted scripted shows on TMDB: no news, reality, soap, talk, kids or documentary shows, animation only in English, and shows not originally in English only with 8,000 votes or more.
  A series needs 2 or more seasons, 12 to 250 episodes with 15 or more votes, and a chart with some shape to it (`minShape`); flat charts are left out.
  Answers are drawn with odds growing with the chart's shape and the show's fame, at most two per main genre a day.
- Wrong options are other well-known shows with about as many seasons.
- A series is not an answer again within 14 days either side, nor while it is a Close-Ups answer within those 14 days.
  Five answers a day from a pool of about 150 shows can't always keep that up once the fortnight around a day is full, so the window then shrinks to 10, 7, 4 and finally 0 days rather than leave a day without a board (found when building #1 to #14 at once).
- Every number is in `RULES.ratingsCliff` and `POINTS.ratingsCliff`.

## Answer protection

- The day route sends charts and option titles only, with opaque option ids; which option is right, the series' name, years and reveal come from the guess route, one round at a time.
- The chart's text alternative gives seasons, episode count, the rating range and season averages, never a name.

## TMDB data

- Boards hold episode ratings, which are TMDB data: `synced_at` dates them, and the cron job re-fetches the ratings on boards older than 5 months (the answers and options stay).

## Code

- Game logic: `src/lib/ratings-cliff/` (chart maths and the reveal line in `chart.ts`, picks in `pick.ts`, state in `state.ts`, all unit-tested).
- Screen: `src/components/ratings-cliff/`, pages under `src/app/ratings-cliff/`, routes under `src/app/api/ratings-cliff/`.
- E2E: `e2e/ratings-cliff.spec.ts` with made-up boards in `e2e/fixtures/ratings-cliff.json`.
