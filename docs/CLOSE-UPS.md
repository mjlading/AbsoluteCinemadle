# Close-Ups

Design notes for Close-Ups, the keyword collage game.
It is a daily: `/close-ups` is today's puzzle by the player's own date, `/close-ups/<date>` an earlier day's, and `/close-ups/archive` lists every day so far.
Puzzles are curated in the collage lab, each with a date, and imported into the `collage_puzzles` table; numbers count from `SITE.closeUpsLaunchDate`.
Rules decided where this file is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Close-Ups".
The 2026-11 redesign (rules, score, layout) is recorded in `docs/superpowers/specs/2026-11-09-close-ups-redesign-design.md`.

## Game

- A puzzle is one hand-picked film or series.
- A clue is a 2x2 collage of close-up crops that share a keyword, such as "shoes", all from the same title.
- A puzzle has 5 keywords in a fixed order, from least to most revealing.
  Every player sees the same clues in the same order, so scores are comparable.
- The game starts with the first keyword open.
- The player has 5 guesses, one per keyword.
  A wrong guess, or a Skip, uses up the current keyword's guess and opens the next keyword.
  The game is lost when the guesses run out; a Skip on the last keyword ends it (the button reads "Give up" there).
- The first keyword always comes from a curated list of everyday objects, so it never gives the title away on its own.
- Keyword tiers (hard, medium, easy) only decide the order and help curation: hard (atmospheric: hands, doors, chairs, lamps), medium (contextual: vehicles, guns, food, hats, jewelry), easy (character-adjacent: mouths, hair, signs).
- One "Enhance" per game, free, widens one close-up by 50%.
- After the game ends, the result panel replaces the guess row, all 5 keywords can be viewed from the strip, and the crops zoom out to their full frames.

## Score

- Solving on guess _n_ (1 to 5) scores `6 - n`; solving on the first guess adds a bonus of 2, so the scores are 7, 4, 3, 2 and 1.
- A loss scores 0.
- The numbers live in `src/config/scoring.ts` (`closeUps`) and `src/config/rules.ts` (`closeUps`).
- The share text is the puzzle name, the score out of 7 and one square per keyword: red for a used keyword, green for the one solved on, black for one never reached.

## Screen

Everything fits on one screen, with no scrolling, at 390 x 844 and 1280 x 800.
Top to bottom:

- A top bar with a back arrow, the name and a `?` help button.
- A dark contact sheet holding the keyword strip, the 2x2 collage and a round Enhance badge where the four tiles meet.
  The strip is also the guess counter: the current keyword is bright tape, a used one is dim with a red marker cross, an unreached one is an empty dashed slot, and the one solved on turns gold.
  Opened keywords can be tapped to view their collage again; locked ones only wiggle.
- A guess box with one button that reads "Skip" while the box is empty and "Guess" once there is text, then the player's misses as chips.
- A footer line with the TMDB attribution.

There are no toasts or rules text on the game screen; the help dialog is the only place the rules are written.
It opens by itself on a first visit.

## Content pipeline

- Choose the title first, then detect objects in its stills and keep keywords that appear in at least 4 different stills.
- Stills come from TMDB backdrops; trailers and other video are never used.
- Detection runs locally and is started by the admin, not by a cron job; the admin then curates the results.
  Collage puzzles have no admin editor yet; they are curated in the collage lab and imported with `npm run db:import-collage`.
- A puzzle needs at least 5 keywords; the server orders them (the free one first, then hard, medium, easy, keeping the stored order within a tier) and the game uses the first 5.
- Crops are filtered by minimum size, maximum share of the frame and detector confidence; there is no blur filter, since it would reject skies, explosions and shallow focus.
- Crops that contain a recognisable face are flagged or dropped, as they can spoil the answer.
- Detector experiments live in [tools/collage-lab](../tools/collage-lab/README.md).

## Later

- The daily schedule: one puzzle per date, puzzle numbers, a countdown to the next puzzle and streaks.
- An admin editor for collage puzzles.
- An LLM check that guesses the title from the keyword labels alone, to catch labels that give it away.
- Separate detector and display labels, so a specific crop ("cymbal") can sit under a broader label ("musical instruments").
- An "extras" keyword: crops of background actors.
  It needs extra care so no main cast member slips in, probably its own LLM pipeline.
