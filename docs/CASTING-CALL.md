# Casting call

Design notes for the Casting call game, from the owner's brief.
Rules decided where the brief is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Casting call".

## Game

- A daily: one board a day, numbered like Close-Ups and Soundbytes (#1 is 2026-11-10), with an archive of earlier days.
- A board shows 8 blurred faces. A Start button unblurs them, reveals all 8 names and starts a 50-second countdown bar (40 until the owner's playtest of 2026-11-14).
- The player guesses films, picked from the title suggestions.
  Every actor on the board who is in a guessed film's cast is crossed out (a red marker cross on the face, a line through the name).
- Any film with at least one actor from the board refills the bar, even if they were already crossed out.
- Crossing out all 8 wins; the score is the number of guesses used, fewer is better.
- The bar running out, or 6 guesses without crossing out all 8, loses; the missed actors are then shown in red.
- A guess that crosses out nobody new still counts; repeating a film is turned away for free.
- Once the game is over, win or lose, the board's best route is shown: the films it was built from (3 or 4), each with its group of actors.
- Share copies `Casting call #5 4/6` and one square per guess: green crossed someone new, red didn't, black unused.

## Daily boards

The owner's brief: obscure films, well-known actors; playtests then moved the films towards known but not famous.

- A board is well-known actors in groups, each group sharing a lesser-known film and no two of them a well-known one.
  On 3 days in 4 the groups are 3+3+2 (best route: 3 films), otherwise 2+2+2+2 (4 films); the layouts and their weights are in `RULES.castingCall.board.layouts`.
  The guesses left over are slack, so a player can still win on a less clever route.
- A 3+3+2 board should also be clearable in pairs, each sharing a film where both are billed in the top 6 (the owner's idea, 2026-11-14), so a player who misses a trio has a second, longer route; the best route shown is still the 3+3+2 one.
  About 4 boards in 5 have one anyway. The generator tries up to 3 boards for one that does, then settles for the first valid one.
- Building is bounded: at most 40 lead actors per group and 3 tries per layout; if the day's layout can't be built, the other one is tried, and only then does the build fail (a player would see "couldn't be made right now" and the next try or cron run builds again).
  Naming each actor's famous films instead crosses out one face a guess and runs out of guesses.
- How well known a film is goes by its rank among all films by TMDB vote count (no animation or documentaries), not by a fixed vote count: every film's votes keep growing, so fixed counts would slowly make the game easier.
  Each build looks up how many votes the film at each rank has that day (one cached TMDB request per rank).
- How a group is found: a lead from the top of the billing of one of the 400 most-voted films; one of their lesser-known films; well-known co-stars from its billing (the biggest groups are found first).
- Well known: at least 8 starring roles (billed in the top 4) in films ranked in the top 1,750 (about 3,000 votes in November 2026), counting only on-screen roles in proper films (no cameos as themselves, voice parts, TV films, animation or documentaries).
  It was 6 roles in films with 1,000+ votes until the owner's first playtest (2026-11-14) found faces such as Kevin Dunn and Clea DuVall too little known.
- The shared film: one ranked #121 to #900 (about 16,800 to 5,200 votes in November 2026) where everyone in the group is billed in the top 6: widely seen, but not a top blockbuster.
  No two in a group may share a film ranked higher. It was 40 to 799 votes, then 300 to 2,499, then 1,500 to 5,999, then ranks #351 to #2,100, then #201 to #1,500, then #151 to #1,200; the owner's playtests on 2026-11-14 found each too hard.
- Every board is checked against every film the 8 are credited in: if fewer films than it has groups could clear it, it is thrown away and another is built.
- Actors and films used on a board aren't used again within 60 days either side.
- The faces are shuffled, so a group never sits in a known place on the board.
- All these numbers are in `RULES.castingCall.board` (`src/config/rules.ts`).

Boards are built on the server, never by hand, and stored in the `casting_call_boards` table:

- A Vercel Cron job calls `/api/cron/casting-call` daily at 04:00 UTC (`vercel.json`). It builds every missing board from the launch date (#1, 2026-11-10) to a week ahead, today and ahead first, and refreshes TMDB data older than 5 months. It needs `CRON_SECRET` in Vercel.
  So the first run fills #1 onwards (the owner asked for days 1 to 5), and a day whose board was deleted is built again; a run stops starting boards after 200 seconds and leaves the rest for the next.
- A player who reaches a day without a board (today somewhere on Earth: UTC-1 to UTC+1 days) gets it built on the spot, in a few seconds, so a missed cron run never leaves a day empty.
- Building is seeded by the date, so the same TMDB data and history give the same board.
  `CASTING_CALL_SEED` (optional) goes into every seed: a new value re-rolls the boards built from then on, for instance after clearing some; boards already stored never change.
- `npm run db:import-casting-call` loads hand-made boards (the E2E fixtures, or a board for a particular day).

The six fixed boards from before the daily are kept, unused, in `tools/casting-call/legacy-boards.json`; `/casting-call/1` to `/casting-call/6` redirect to today's board.

## Answer protection

Who is on the board is the puzzle, so it follows the project's hard rules on answers:

- The client gets faces under opaque ids (their position on the board) and pictures rendered by our own image route, never TMDB person ids or file paths.
- A guess returns only the faces in that film, with their names.
- The solution route names every face, for when the player presses Start; the best-route route names the board's films, for when the game is over. Calling either early only spoils the caller's own game.

## Code

- Building boards: `src/lib/casting-call/generate.ts` (pure, with unit tests); storing and serving them: `src/lib/casting-call/source.ts`.
- Logic: `src/lib/casting-call/state.ts`, with unit tests.
- Server: `src/lib/casting-call/handlers.ts`, routes under `src/app/api/casting-call/` and `src/app/api/cron/casting-call/`.
- UI: `src/components/casting-call/`, pages under `src/app/casting-call/`.
- Player flows: `e2e/casting-call.spec.ts`, on fixture boards (`e2e/fixtures/casting-call.json`), with TMDB stubbed apart from one real playthrough that needs a token.

## Not in this version

- Scoring in `scoring.ts`, hints (such as revealing one name), and an admin editor for boards.
