# Prototype games

Five dailies under test since 2026-11-15, linked from a plain "Prototypes" list on the home page.
They exist to find a game that is fun whether or not the player has seen any one film.
Visuals and tests are kept minimal on purpose; the one that earns its place gets a proper design, an archive and E2E tests.

## What they share

- Boards build themselves from TMDB on a day's first visit and are stored in `prototype_boards`, one JSON document per game and date (`src/lib/prototypes/boards.ts`).
  A board is built again when its game's generator `version` changes, when its data no longer fits the schema, or when it is older than 150 days (TMDB's 6-month limit).
- `PROTOTYPE_SEED` (optional, like `CASTING_CALL_SEED`) re-rolls boards built from then on.
- Any day from `SITE.prototypeLaunchDate` (2026-11-01) can be played at `/<game>/<date>`; each game shows a "Previous day" link instead of an archive.
- Pictures go through `/api/prototypes/[boardId]/images/[imageId]`, so TMDB file paths never reach the client.
- Each guess is checked by the server, which reveals that round's answer only.
- Rule numbers are in `RULES.<game>` and point values in `POINTS.<game>`; each game's code is in `src/lib/<game>`, `src/components/<game>` and `src/app/<game>`.
- There is no cron job: a day nobody visits has no board, which costs nothing.

## Carbon Dating (`/carbon-dating`)

Five stills a day, each from a different decade (1940s to 2020s), shown without titles; guess the release year.
100 points for the exact year, 8 fewer per year off.
Films are well-known live-action features, with a vote-count floor per decade; stills are textless 16:9 TMDB backdrops.
Known weak points: about 1 still in 5 is studio key art, not a frame (4K backdrops are ranked last because they were all key art); older decades repeat films within days.

## How Old Were They? (`/how-old`)

Five rounds a day: an actor, a film's poster and title, and the character; guess the actor's age when the film came out.
100 points for the exact age, 12 fewer per year off. The release year is hidden until the reveal (`RULES.howOld.hideYear`).
Boards spread the true ages over at least four age bands and favour child, early and late-career roles.
Known weak points: the slope is harsh (9 years off scores 0); some picks are little-known or weak films.

## Double Feature (`/double-feature`)

Ten pairs of films a day with one question each, rotating between runtime, budget, box office, rating and release date; pick the winner.
One point per right pick; all ten rounds are always played.
Films come from the 600 most-voted on TMDB; pairs must differ by a clear margin, and money pairs are within 15 years of each other.
Money is as TMDB reports it, not adjusted for inflation, and the round says so.
Known weak points: unconstrained pairs can be too easy; a day's first load takes about 6 seconds.

## Ratings Cliff (`/ratings-cliff`)

Five series a day, each shown as a grid of its episode ratings (a column per season, a row per episode, each cell coloured by its rating) with no names; pick the show from four options.
One point per right pick. It is the site's first game about TV series.
Series come from about the 200 most-voted scripted shows; a series needs at least 2 seasons, 12 to 250 rated episodes and a chart with some shape to it.
TMDB's episode ratings show the shapes people know (Game of Thrones' last season, Dexter's finale); long sitcoms are mostly too thinly voted to qualify.
Known weak points: many answers share the "final season sank" shape; the pool's lower half is only mid-famous.

## Deep Cut (`/deep-cut`)

Three prompts a day with many right answers ("A film with Clint Eastwood", "A horror film from the 1960s", "A heist film"); name a film that fits, the less obvious the better.
A film that doesn't fit uses one of three tries. A fitting film scores 0 to 100 by rarity.
Rarity is estimated from fame, since there are no player counts yet: the prompt's most-voted film on TMDB scores 0 and films at 50 votes score 100, on a log scale.
`fame()` in `src/lib/deep-cut/rarity.ts` is the one place to swap in real guess counts later.
Prompts are an actor, a director, a genre and decade, or a theme (hand-checked TMDB keywords in `src/lib/deep-cut/themes.ts`).
Known weak points: a fitting film is refused when TMDB lacks the keyword or genre tag; small director sets make "rarer than N%" jumpy; films only, no series.
