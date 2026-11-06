# Keyword collage

Design notes for the keyword collage game, agreed with the owner before implementation.
The game is playable at `/keyword-collage`, with puzzles curated in the collage lab and imported into the `collage_puzzles` table.
Rules decided where this file is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Keyword collage".

## Game

- One hand-picked film or series per day.
- A clue is a 2x2 collage of close-up crops that share a keyword, such as "shoes", all from the same title.
- The whole collage is shown at once; a new hint is a new keyword collage, not more images of the same one.
- The player starts with one free collage and picks which locked keyword to open next, each with a point cost.
- The first, free keyword always comes from a curated list of everyday objects, so it never gives the title away on its own.
- Point costs are set by the admin per keyword, based on how revealing the images are, not on the word alone.
- Keyword tiers set the cost: hard (atmospheric: hands, doors, chairs, lamps), medium (contextual: vehicles, guns, food, hats, jewelry), easy (character-adjacent: mouths, hair, signs).
- One "Enhance" per game widens one close-up by about 50%.
- After the game ends, the crops zoom out to their full frames.

## Content pipeline

- Choose the title first, then detect objects in its stills and keep keywords that appear in at least 4 different stills.
- Stills come from TMDB backdrops; trailers and other video are never used.
- Detection runs locally and is started by the admin, not by a cron job; the admin then curates the results in `/admin`.
- Crops are filtered by minimum size, maximum share of the frame and detector confidence; there is no blur filter, since it would reject skies, explosions and shallow focus.
- Crops that contain a recognisable face are flagged or dropped, as they can spoil the answer.
- Detector experiments live in [tools/collage-lab](../tools/collage-lab/README.md).

## Later

- An LLM check that guesses the title from the keyword labels alone, to catch labels that give it away.
- Separate detector and display labels, so a specific crop ("cymbal") can sit under a broader label ("musical instruments").
- An "extras" keyword: crops of background actors.
  It needs extra care so no main cast member slips in, probably its own LLM pipeline.
