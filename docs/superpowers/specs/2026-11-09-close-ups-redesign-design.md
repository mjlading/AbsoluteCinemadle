# Close-Ups: redesign of the keyword collage game

Agreed with the owner on 2026-11-09, from playtests and a clickable mockup.
This round is the game's design, rules and layout.
Turning it into a real daily (one puzzle per date, numbering, a countdown) is the next project and is out of scope here.

## Why

Playtesters had to be told to scroll down to find more keywords: the first collage fills the screen, and the locked keywords sit about 1.5 screens below it, under the guess box.
Around the one picture there is a lot of explaining (Points, Guesses left, "Free clue", cost labels, an Enhance sentence, a "Which film is it?" heading), where the owner wants the game to explain itself.
The 1000-point economy with tiered unlock costs is also more to learn than a daily game should ask.

## Goals

- Everything the player needs is on one screen, with no scrolling, on a phone (390 × 844) and on a desktop (1280 × 800).
- The game explains itself by what is on screen; rules text lives only in the help dialog.
- One simple score that every game mode can share later: 5 guesses, and the guesses you have left are your points.
- A modern, sleek, fun look that stays in the site's light-table and contact-sheet style.

## Non-goals

- The daily schedule, puzzle numbers, a countdown to the next puzzle and streaks: the next project.
- A leaderboard or player accounts. The score is designed so it can feed one later, but nothing is recorded on the server now.
- Moving other game modes to the 5-point score.
- An admin editor for collage puzzles.
- The speed of the full-frame route (see "Known issue" below).

## Anti-goals

- Players needing to be told how to find more clues.
- Any rules or how-to text on the game screen itself.
- Choices that collapse into one obvious move (such as letting players pick which keyword to open next when one is always best).

## Decisions

### Name

- The game is called **Close-Ups** (hyphenated), in every place a player sees it: home card, page titles, metadata, the game header, help, share text.
- The player-facing route moves from `/keyword-collage` to `/close-ups`, with permanent redirects from `/keyword-collage` and `/keyword-collage/<id>`.
- Internal names (`src/lib/collage`, `src/components/collage`, `/api/collage`, the `collage_puzzles` table) stay as they are.

### Home page

- Remove the "Daily film puzzle" card from the home page, since it has no real puzzles yet.
  The `/daily` route and its code stay, so the card can come back.
- The Close-Ups card keeps its "In development" badge until the daily project ships.

### Rules

- A puzzle has 5 keywords, in a fixed, curated order from least to most revealing; the first is the free starter.
- The game starts with the first keyword open.
- The player has 5 guesses, one per keyword.
  A wrong guess, or a Skip, uses up the current keyword's guess and opens the next keyword.
- A Skip on the last keyword ends the game as a loss (the button reads "Give up" there).
- Guards against losing a guess by accident (builder's call, approved with this document):
  pressing Enter in an empty guess box does nothing, so a Skip always takes a press of the Skip button;
  "Give up" needs a second press (the button reads "Give up?" for about 3 seconds after the first).
  The old "Give up and show the film" link goes; quitting early means skipping to the end.
- Repeating a guess (ignoring case, accents and punctuation) is turned away for free, as now.
- Guesses match like today: a film picked from the suggestions, or a typed title with the existing typo tolerance.
- "Enhance" stays: once per game, free, it widens one close-up by 50%.
- Players can no longer choose which keyword to open; the owner chose a fixed order so every player sees the same clues at the same cost, which keeps scores comparable.

### Score

- Solving on guess *n* (1 to 5) scores `6 - n`; solving on the first guess adds a bonus of 2, so the scores are 7, 4, 3, 2, 1.
- A loss scores 0.
- The guess count, the starting 5 and the +2 bonus live in the scoring config (`src/config/scoring.ts`), with the guess count in `src/config/rules.ts` as today; no number is hardcoded elsewhere.
- Tier-based unlock costs, the 1000-point start and the cost of a wrong guess are removed.
  Keyword tiers stay in the data, for curation and ordering only.

### Layout

The mockup the owner approved is the reference: `.superpowers/brainstorm/2986-1794224804/content/closeups-layout.html` (kept locally, not committed; open it in a browser).

Top to bottom, on every screen size:

1. **Top bar** (56 px): a back arrow to the game list, the name "Close-Ups" with the puzzle's name in small text beside it, and a round `?` button for help.
2. **Board**: a dark contact sheet (rounded, padded) holding:
   - **The keyword strip**: the 5 keywords as tape labels in one row, equal widths, uppercase condensed type.
     The strip is also the guess counter, so there is no separate counter anywhere:
     - the current keyword is bright paper tape with torn ends;
     - a used keyword is dim tape with a small red marker cross in its corner (drawn in, as in Casting call);
     - a keyword not reached yet is an empty dashed slot showing its name;
     - the keyword the game was won on turns gold.
     Tapping an opened keyword shows its collage again.
     Tapping a locked slot does nothing but wiggle it and nudge the Skip button.
   - **The collage**: the current keyword's 4 close-ups as a square 2 × 2 grid, as large as the screen allows.
   - **The Enhance button**: a round magnifier badge where the four tiles meet.
     Pressing it enters a picking mode where the next close-up tapped is widened; it then disappears for the rest of the game.
3. **Guess row**, directly under the board: a text box ("Name the film…") with suggestions opening upwards, and one button that reads "Skip" while the box is empty and "Guess" once there is text.
4. **Guess history**: the player's misses as small chips, struck through in red marker; skips show as "Skipped" in italics.
5. **Footer line**, pinned to the bottom of the screen: the TMDB logo and attribution and "Film stills belong to their copyright holders." in one compact row (about 28 px, small type), which keeps the hard rule that TMDB attribution sits in the footer.
   It counts towards the no-scroll height budget (builder's call, approved with this document).
   The mockup leaves this row out.

Sizing:

- The page itself never scrolls at 390 × 844 or 1280 × 800.
  The board's width is the smallest of: the screen width less 16 px gutters, the height left after the other rows, and 600 px.
- On phones (under 700 px wide) the group sits at the top, so the on-screen keyboard can open below the guess row without moving anything.
  On wider screens the group is centred vertically.
- On very short screens (landscape phones) the board may shrink to about 240 px and the page may then scroll.

Feedback:

- A miss makes the collage jump like film slipping in the gate (the existing `gate-slip` effect) and shakes the guess row; the new keyword's tape sticks on with a small pop, and the grid cross-fades to it.
- No toasts or sentences on the game screen at all, so the game needs no toast component (builder's call, approved with this document):
  - a miss is shown by the strip and the history;
  - a repeated guess shakes the guess row and briefly pulses the matching history chip;
  - Enhance picking mode is shown by the pressed magnifier and the highlighted, zoom-cursor tiles, with no "tap a close-up" hint (the mockup's two toasts go).
- Screen readers get each of these from a polite live region ("Not Gladiator. Boots is open.", "Already guessed Gladiator.", "Pick a close-up to widen.").

### End of game

The guess row and history are replaced, in place, by a result panel under the board:

- the poster, a small line ("Got it", "First clue!" or "It was"), the title and year;
- the score as a large number, with a gold "+2 first clue" badge when it applies;
- a Share button that copies a text like `Close-Ups Demo 1 4/7` plus one emoji per keyword (🟥 used, 🟩 solved, ⬛ not reached);
- a link to play another puzzle.
  A countdown to the next puzzle replaces this link in the daily project.

All 5 keywords become viewable from the strip, and every collage zooms out from the close-ups to the full frames (the existing zoom-out), each tile starting as soon as its frame has loaded.

### Help

- The `?` dialog has three short lines with small icons: name the film from four close-ups sharing a keyword; every miss or skip opens the next keyword, five in all; points are the guesses left, +2 for the first clue.
- It opens by itself on a player's first visit to the game (remembered in localStorage), and not again.

### Themes and accessibility

- Works in light and dark; the board is the dark contact sheet in both.
- The keyword strip is a tab list; locked slots are disabled tabs.
- Keyboard: everything is reachable, including picking a tile to enhance.
- Focus stays where it was after a miss or a Skip (in the guess box after a typed guess, so a phone keeps its keyboard open between guesses); the live region announces the newly opened keyword (builder's call, approved with this document).
- Tile alt text stays answer-free ("Boots, close-up 2 of 4").

### Data

- The reveal order is set on the server when a puzzle is read, so it never depends on how a puzzle was exported (builder's call, approved with this document):
  the free keyword first, then the rest by tier (hard, medium, easy), keeping the stored order within a tier.
- A puzzle needs at least 5 keywords; the game uses the first 5 in that order and ignores the rest.
  The three demo puzzles have 6 each, so they keep working and lose one of their most revealing keywords (Demo 1, stored as Hands, Boots, Swords, Coats, Hair, Mouths, loses Mouths).
- The public puzzle shape drops `cost`.
- Saved progress uses a new localStorage key per puzzle (`close-ups:<id>`), since the saved state changes shape; old `collage:<id>` entries are ignored.

## Constraints

- The project's hard rules in `AGENTS.md` apply: guesses are checked on the server, the answer reaches the client only once it is earned or the game is lost, tile images come through our own image route under opaque ids, and every point value lives in the scoring config.
- Pages that show collages keep the line "Film stills belong to their copyright holders."
- Check the result in a real browser at 390 px and desktop, in both themes, and with the keyboard only.

## Left to the builder

- The exact look of the tape (torn-edge shape, colours, the marker cross) within the mockup's direction.
- Animation timings.
- How state, reducer and tests are restructured, and whether the free-keyword flag is still needed in the client shape.
- When the next keyword's images are preloaded.
- Updating `docs/KEYWORD-COLLAGE.md` (or renaming it), `ASSUMPTIONS.md`, `AGENTS.md`'s status section, the unit tests and the E2E tests to match.

## Known issue, outside this round

On the live site the full-frame images used by the end-of-game zoom-out took about 20 seconds each to load on 2026-11-09, while the close-ups were fast.
The owner's work network inspects traffic (Check Point), and later that day blocked the site outright, so it is the likely cause; it still needs checking from another network before launch.
