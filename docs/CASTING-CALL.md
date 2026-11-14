# Casting call

Design notes for the Casting call game, from the owner's brief.
Rules decided where the brief is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Casting call".

## Game

- A daily: one board a day, numbered like Close-Ups and Soundbytes (#1 is 2026-11-10), with an archive of earlier days.
- A board shows 8 blurred faces. A Start button unblurs them, reveals all 8 names and starts a 40-second countdown bar.
- The player guesses films, picked from the title suggestions.
  Every actor on the board who is in a guessed film's cast is crossed out (a red marker cross on the face, a line through the name).
- Any film with at least one actor from the board refills the bar, even if they were already crossed out.
- Crossing out all 8 wins; the score is the number of guesses used, fewer is better.
- The bar running out, or 5 guesses without crossing out all 8, loses; the missed actors are then shown in red.
- A guess that crosses out nobody new still counts; repeating a film is turned away for free.
- Once the game is over, win or lose, the board's best route is shown: the 4 films it was built from, each with its pair of actors.
- Share copies `Casting call #5 4/5` and one square per guess: green crossed someone new, red didn't, black unused.

## Daily boards

The owner's brief: obscure films, well-known actors; playtests then moved the films towards known but not famous.

- A board is 4 pairs of well-known actors, each pair sharing a lesser-known film and no well-known one.
  The best route is one film per pair, 4 guesses; the 5th guess is slack, so a player can still win on a less clever route.
  Naming each actor's famous films instead crosses out one face a guess and runs out of guesses.
- How well known a film is goes by its rank among all films by TMDB vote count (no animation or documentaries), not by a fixed vote count: every film's votes keep growing, so fixed counts would slowly make the game easier.
  Each build looks up how many votes the film at each rank has that day (one cached TMDB request per rank).
- How a pair is found: a lead from the top of the billing of one of the 400 most-voted films; one of their lesser-known films; a well-known co-star from its billing.
- Well known: at least 8 starring roles (billed in the top 4) in films ranked in the top 1,750 (about 3,000 votes in November 2026), counting only on-screen roles in proper films (no cameos as themselves, voice parts, TV films, animation or documentaries).
  It was 6 roles in films with 1,000+ votes until the owner's first playtest (2026-11-14) found faces such as Kevin Dunn and Clea DuVall too little known.
- The shared film: one ranked #351 to #2,100 (about 10,000 to 2,500 votes in November 2026) where both are billed in the top 6: widely seen, but not a top blockbuster.
  The pair may share no film ranked higher. It was 40 to 799 votes, then 300 to 2,499, then 1,500 to 5,999; the owner's playtests on 2026-11-14 found each too hard.
- Every board is checked against every film the 8 are credited in: if fewer than 4 films could clear it, it is thrown away and another is built.
- Actors and films used on a board aren't used again within 60 days either side.
- The faces are shuffled, so a pair never sits in a known place on the board.
- All these numbers are in `RULES.castingCall.board` (`src/config/rules.ts`).

Boards are built on the server, never by hand, and stored in the `casting_call_boards` table:

- A Vercel Cron job calls `/api/cron/casting-call` daily at 04:00 UTC (`vercel.json`), which keeps 8 days of boards ready and refreshes TMDB data older than 5 months. It needs `CRON_SECRET` in Vercel.
- A player who reaches a day without a board (today somewhere on Earth: UTC-1 to UTC+1 days) gets it built on the spot, in a few seconds, so a missed cron run never leaves a day empty.
- Building is seeded by the date, so the same TMDB data and history give the same board.
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
