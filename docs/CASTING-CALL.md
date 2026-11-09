# Casting call

Design notes for the Casting call game, from the owner's brief.
Rules decided where the brief is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Casting call".

## Game

- A board shows 8 blurred faces. A Start button unblurs them, reveals all 8 names and starts a 40-second countdown bar.
- The player guesses films, picked from the title suggestions.
  Every actor on the board who is in a guessed film's cast is crossed out (a red marker cross on the face, a line through the name).
- Any film with at least one actor from the board refills the bar, even if they were already crossed out.
- Crossing out all 8 wins; the score is the number of guesses used, fewer is better.
- The bar running out, or 5 guesses without crossing out all 8, loses; the missed actors are then shown in red.
- A guess that crosses out nobody new still counts; repeating a film is turned away for free.

## Answer protection

Who is on the board is the puzzle, so it follows the project's hard rules like the daily grid:

- The client gets faces under opaque ids (their position on the board) and pictures rendered by our own image route, never TMDB person ids or file paths.
- A guess returns only the faces in that film, with their names.
- The solution route names every face, for when the player presses Start; calling it early only spoils the caller's own game.

## Code

- Boards: `src/lib/casting-call/boards.ts` (eight TMDB person ids each, drawn from separate well-known films).
- Logic: `src/lib/casting-call/state.ts`, with unit tests.
- Server: `src/lib/casting-call/handlers.ts`, routes under `src/app/api/casting-call/`.
- UI: `src/components/casting-call/`, pages under `src/app/casting-call/`.

## Difficulty

After the owner's playtest (2026-11-08) cleared the first boards in two films, the boards were rebuilt so that the actors come from separate films.
Boards run from easiest to hardest: boards 1 and 2 take at least 3 films and boards 3 to 6 at least 4, checked against TMDB casts.
The 5 guesses and the 40-second bar are unchanged.

## Not in this version

- A daily board, sharing, scoring in `scoring.ts`, hints (such as revealing one name), and an admin editor for boards.
