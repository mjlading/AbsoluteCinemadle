# Close-Ups Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the keyword collage game into Close-Ups: 5 guesses through 5 keywords in a fixed order, a 7/4/3/2/1 score, and a one-screen layout where the keyword strip doubles as the guess counter.

**Architecture:** The server fixes the reveal order and trims every puzzle to 5 keywords when it reads them, and drops costs from the public shape.
The client keeps a smaller reducer (guesses and skips only), and the game screen is rebuilt from small components: keyword strip, board, guess row, history, result panel and help.
Sizing is pure CSS (container query units), so the page does not scroll at 390 × 844 or 1280 × 800.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before using an API), React 19, TypeScript, Tailwind v4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-close-ups-redesign-design.md` (read it first).
The approved mockup is `.superpowers/brainstorm/2986-1794224804/content/closeups-layout.html` (local only; open it in a browser).

## Global Constraints

- The player-facing name is exactly "Close-Ups" (hyphenated, capital U) everywhere a player sees it.
- No em dashes in code, copy, docs or commit messages; use a plain "-".
- Commit messages carry no AI co-author line (the owner's rule).
- Every point value lives in `src/config/scoring.ts`, every rule number in `src/config/rules.ts`; nothing hardcoded elsewhere.
- Hard rules in `AGENTS.md` hold: guesses checked on the server, the answer only reaches the client once earned or lost, tiles only through our image route under opaque ids, tile alt text never names the film.
- No how-to text or toasts on the game screen; rules text only in the help dialog. Error messages (a guess that could not be checked) are not how-to text and may show inline.
- The TMDB attribution stays in a footer; pages showing collages carry "Film stills belong to their copyright holders."
- Long Markdown: one sentence per line.
- Work on a branch, not `main`: `git switch -c close-ups-redesign` before Task 1.

## Review Focus

- A player with an in-progress game from the old version (`collage:<id>` in localStorage) gets a fresh Close-Ups game, not a crash (Task 4 test).
- A guess whose network request fails costs nothing and says so inline; the guess box keeps the text (Task 4 test).
- Pressing Enter twice fast, or tapping Guess while a guess is in flight, spends one guess, not two (Task 4 test).
- A landscape phone (844 × 390) can still reach the guess box and play, scrolling if it must (Task 4 test).
- A stored puzzle with fewer than 5 keywords is refused by the schema instead of breaking the game (Task 2 test).

---

### Task 1: Name, routes and home page

**Files:**
- Move: `src/app/keyword-collage/` to `src/app/close-ups/` (both `page.tsx` files)
- Modify: `next.config.ts` (permanent redirects)
- Modify: `src/config/site.ts` (`keywordCollage` key becomes `closeUps: "/close-ups"`)
- Modify: `src/app/page.tsx` (remove the "Daily film puzzle" card and its `DailyArtwork` if then unused; rename the collage card)
- Modify: `src/components/collage/PuzzleList.tsx` (links to `/close-ups/<id>`)
- Modify: `e2e/game-modes.spec.ts`
- Test: `e2e/game-modes.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SITE.games.closeUps = "/close-ups"`; routes `/close-ups` and `/close-ups/[puzzleId]`.

- [ ] **Step 1: Update the failing E2E tests** in `game-modes.spec.ts`:
  - the home page has a card with heading "Close-Ups" (still "In development"), and no heading "Daily film puzzle";
  - keyboard navigation reaches the card and lands on `/close-ups`, heading "Close-Ups";
  - `redirects the old address`: `page.goto("/keyword-collage/fixture1")` ends on `/close-ups/fixture1`, and `/keyword-collage` ends on `/close-ups`.

- [ ] **Step 2: Run** `npm run test:e2e -- e2e/game-modes.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  Redirects in `next.config.ts` with `redirects()` (`permanent: true`) for `/keyword-collage` and `/keyword-collage/:puzzleId`.
  Page metadata titles "Close-Ups | Absolute Cinemadle"; the list page heading "Close-Ups".
  Point `e2e/keyword-collage.spec.ts`'s `goto` at `/close-ups` so it keeps passing until Task 4 replaces it.
  `/daily` and its code stay untouched.

- [ ] **Step 4: Run** `npx playwright test e2e/game-modes.spec.ts` and `npm run lint`. Expected: PASS, no lint errors.

- [ ] **Step 5: Commit** `git commit -m "Rename the keyword collage to Close-Ups and drop the empty daily card"`.

---

### Task 2: Rules, scoring and game state

**Files:**
- Modify: `src/config/rules.ts` (rename `keywordCollage` to `closeUps`)
- Modify: `src/config/scoring.ts` (replace `keywordCollage`)
- Modify: `src/lib/collage/state.ts`
- Test: `src/lib/collage/state.test.ts` (rewrite)
- Modify: `src/lib/collage/image.ts:47` (follow the rename)

**Interfaces:**
- Produces: `RULES.closeUps = { keywordsPerPuzzle: 5, maxGuesses: 5, tilesPerCollage: 4, enhancesPerGame: 1, enhanceFactor: 1.5 }`.
- Produces: `POINTS.closeUps = { start: 5, perMissOrSkip: -1, firstClueBonus: 2 }`.
- Produces, from `state.ts`:
  - `interface CollageState { guesses: { text: string | null; correct: boolean }[]; enhanced: string | null; status: "playing" | "won" | "lost"; answer: CollageAnswer | null }` (`text: null` is a skip).
  - `type CollageAction = { type: "guess"; text: string; correct: boolean; answer?: CollageAnswer } | { type: "skip" } | { type: "enhance"; tileId: string } | { type: "reveal"; answer: CollageAnswer }`.
  - `initialCollageState(): CollageState`, `collageReducer(state, action): CollageState` (no puzzle argument any more).
  - `currentRound(state): number` (0-based index of the open keyword: the count of misses and skips, capped at `maxGuesses - 1`).
  - `guessesLeft(state): number`, `collageScore(state): number`, `isFirstClueWin(state): boolean`, `alreadyGuessed(state, text): boolean`.
  - `maxCollageScore(): number` (start plus bonus, 7), for the share text.
- Removes: `canUnlock`, `unlockCost`, `wrongGuesses`, the `unlock` and `give_up` actions.

- [ ] **Step 1: Write the failing tests** in `state.test.ts`, `describe("Close-Ups state")`:
  - `starts on the first keyword with 5 guesses and nothing enhanced`: `currentRound` 0, `guessesLeft` 5, status `"playing"`.
  - `a miss or a skip opens the next keyword`: after `wrong("Jaws")` and `{ type: "skip" }`, `currentRound` 2, `guessesLeft` 3.
  - `scores 7 on the first clue, then 4, 3, 2, 1`: wins after 0..4 misses give `[7, 4, 3, 2, 1]`; `isFirstClueWin` true only for the first.
  - `is lost on the fifth miss or skip and scores 0`: five misses/skips give status `"lost"`, score 0, `currentRound` 4.
  - `ignores a repeated guess` (case, accents and punctuation as `normalizeTitle`): `wrong("Jaws")`, `wrong("jaws!")` leaves one guess.
  - `ignores everything once the game is over`: guess, skip and enhance after a win change nothing.
  - `allows one enhance per game`.
  - `the score comes from the scoring config`: `maxCollageScore()` equals `POINTS.closeUps.start + POINTS.closeUps.firstClueBonus`.

- [ ] **Step 2: Run** `npx vitest run src/lib/collage/state.test.ts`. Expected: FAIL (missing exports).

- [ ] **Step 3: Implement** the config changes and `state.ts` to the interfaces above.
  Score: won on guess `n = currentRound + 1` gives `start + perMissOrSkip * (n - 1)`, plus `firstClueBonus` when `n === 1`; lost gives 0.

- [ ] **Step 4: Run** `npx vitest run src/lib/collage` and `npm run typecheck`. Expected: state tests PASS. From here until Task 4 the app does not build; typecheck errors only in files Tasks 3 and 4 rewrite (`handlers.ts`, `CollageGame.tsx`). Note them; do not patch them here.

- [ ] **Step 5: Commit** `git commit -m "Close-Ups rules: five guesses through five keywords, 7/4/3/2/1 score"`.

---

### Task 3: Reveal order and the public puzzle shape

**Files:**
- Create: `src/lib/collage/order.ts`, `src/lib/collage/order.test.ts`
- Modify: `src/lib/collage/puzzle-schema.ts`, `src/lib/collage/puzzle-schema.test.ts`
- Modify: `src/lib/collage/source.ts` (apply the order in `toPuzzle`)
- Modify: `src/lib/collage/types.ts` (`PublicCollageKeyword` loses `tier`, `cost` and `free`)
- Modify: `src/lib/collage/handlers.ts` (`toPublicCollage` follows; drop the `unlockCost` import)

**Interfaces:**
- Consumes: `RULES.closeUps.keywordsPerPuzzle` (Task 2).
- Produces: `revealOrder(keywords: CollageKeyword[]): CollageKeyword[]` in `order.ts`: the free keyword first, then the rest by tier `hard`, `medium`, `easy`, stable within a tier, sliced to `keywordsPerPuzzle`.
- Produces: `PublicCollageKeyword = { id: string; label: string; tiles: PublicCollageTile[] }`; `PublicCollagePuzzle.keywords` always has exactly 5 entries, in reveal order.
- Server-side, a 6th keyword's tiles are no longer part of the puzzle (its image URLs answer 404), since `getCollagePuzzle` returns the trimmed puzzle.

- [ ] **Step 1: Write the failing tests.**
  `order.test.ts`: `puts the free keyword first and sorts the rest hard, medium, easy` (input order easy, hard*, medium, hard, easy, medium gives hard*, hard, medium, medium, easy); `keeps the stored order within a tier`; `keeps only the first 5`.
  `puzzle-schema.test.ts`: `refuses a puzzle with fewer than 5 keywords` (4 keywords fails `CollagePuzzleSchema.safeParse`).

- [ ] **Step 2: Run** `npx vitest run src/lib/collage`. Expected: FAIL.

- [ ] **Step 3: Implement** `revealOrder`, the schema's `.min(RULES.closeUps.keywordsPerPuzzle)` on `CollageKeywordsSchema`, the call in `toPuzzle`, and the slimmer public shape.

- [ ] **Step 4: Run** `npx vitest run src/lib/collage`. Expected: PASS.

- [ ] **Step 5: Commit** `git commit -m "Serve Close-Ups keywords in a fixed reveal order, five per puzzle"`.

---

### Task 4: The one-screen game

This is the bulk of the work. Follow the spec's "Layout", "End of game", "Help" and "Themes and accessibility" sections, with the mockup as the visual reference.

**Files:**
- Rewrite: `src/components/collage/CollageGame.tsx` (loading, persistence, wiring; keep it the only stateful component)
- Create: `src/components/collage/KeywordStrip.tsx`, `src/components/collage/GuessHistory.tsx`, `src/components/collage/ResultPanel.tsx`, `src/components/collage/HelpDialog.tsx`
- Modify: `src/components/collage/CollageTiles.tsx` (grid with the Enhance badge; `ZoomOutTile` starts per tile once its own frame has loaded; drop `useAllLoaded` if unused)
- Modify: `src/components/warmup/TitleGuess.tsx` (two optional props, below)
- Modify: `src/components/game/SiteFooter.tsx` (a `compact` variant)
- Modify: `src/components/collage/PuzzleList.tsx` (progress read from `close-ups:<id>`)
- Modify: `src/app/close-ups/[puzzleId]/page.tsx` (full-height shell: `h-dvh` column, top bar, stage, compact footer)
- Modify: `src/app/globals.css` (tape, marker-cross and stick animations, beside the existing `marker-draw` and `gate-slip`)
- Rewrite: `e2e/keyword-collage.spec.ts` as `e2e/close-ups.spec.ts`
- Modify: `e2e/fixtures/keyword-collage.json` only if a test needs it (it already has exactly 5 keywords: Hands free, Doors, Food, Mouths, Signs; answer Back to the Future)

**Interfaces:**
- Consumes: Task 1 routes, Task 2 state API, Task 3 public shape.
- `TitleGuess` gains `listPlacement?: "below" | "above"` (default `"below"`) and `emptyAction?: { label: string; onPress: () => void }`.
  With `emptyAction`, the button beside the box reads `emptyAction.label` and calls `onPress` while the box is empty, and reads "Guess" otherwise; Enter in an empty box does nothing. The warm-up passes neither and is unchanged.
- `SiteFooter` gains `compact?: boolean`: one tight row (logo, the TMDB sentence, then "Film stills belong to their copyright holders.") in 11 px type.
- `KeywordStrip({ labels: string[]; round: number; status: CollageState["status"]; view: number; onView: (i: number) => void; onLockedPress: () => void })`: a `role="tablist"`; slot states current, spent (with the drawn marker cross), locked (dashed, `aria-disabled`), won (gold); after the game every slot is viewable.
- `ResultPanel({ puzzle, state, nextPuzzleId: string | null })`: poster, line ("First clue!", "Got it", "It was"), title, year, score (gold "+2 first clue" badge when `isFirstClueWin`), Share (copies `Close-Ups <puzzle name> <score>/<maxCollageScore()>` plus a line of emoji: 🟥 used, 🟩 solved, ⬛ not reached; the button reads "Copied" for 2 s), and a link to the next puzzle (or the list when there is none).
- The board width is pure CSS: the stage is a size container, and the board is `min(100cqw, 100cqh - <rows below and gaps>, 600px)`; under 700 px wide the group is top-aligned, otherwise centred.
- localStorage: game state under `close-ups:<id>` with the 5 keywords' tile ids as the signature; help seen under `close-ups:help-seen`.

- [ ] **Step 1: Write the failing E2E tests** in `e2e/close-ups.spec.ts` (open `/close-ups`, pick "Test puzzle"; dismiss the help dialog where a test does not cover it):
  - `the help opens on the first visit only`: the "How to play" dialog shows, closes with its button, and does not return after a reload.
  - `a game: a miss, Enter on an empty box, a skip, enhance, then the right guess`: the API response does not contain "Back to the Future"; guess "Jaws" leaves the Hands tab spent and Doors current with 4 `Doors, close-up n of 4` images, and a "Jaws" chip; Enter in the empty box changes nothing; the Skip button opens Food; enhancing "Food, close-up 2 of 4" shows the enhanced image and removes the Enhance button; guessing "back to the futur" shows the heading "Back to the Future" and the score 3; Share puts `Close-Ups Test puzzle 3/7` on the clipboard (grant `clipboard-read`/`clipboard-write`); every tab is now selectable and shows `full frame` images.
  - `the first clue wins 7 with the bonus`: a right first guess shows 7 and "+2 first clue".
  - `five misses lose, and giving up takes two presses`: four skips/misses, then "Give up" once leaves the game on; a second press shows "It was", "Back to the Future" and 0.
  - `a repeated guess costs nothing`: "Jaws" then "jaws" leaves Food locked.
  - `a reload mid-game resumes, and an old saved game is ignored`: seed `collage:fixture1` with the old shape before loading; play one miss, reload, Doors is still current.
  - `a guess that can't be checked costs nothing`: route `/api/collage/*/guess` to abort; guessing shows an inline error, Hands stays current, the box keeps the text.
  - `a double submit spends one guess`: delay the guess route, press Enter twice; one chip, Doors current.
  - `fits one screen`: at 390 × 844 and 1280 × 800, `document.scrollingElement.scrollHeight <= innerHeight` and no horizontal overflow; at 844 × 390 the guess box can be scrolled into view and used.
  - `playable by keyboard alone`: Tab to the guess box, type, choose a suggestion with arrow keys, Tab to the strip and move between opened keywords, use Enhance with the keyboard.

- [ ] **Step 2: Run** `npm run test:e2e -- e2e/close-ups.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** the components and page above.
  Misses run the `gate-slip` effect on the board and shake the guess row; the new tape sticks on; the grid cross-fades.
  A polite live region announces misses ("Not Jaws. Doors is open."), repeats ("Already guessed Jaws."), Enhance mode ("Pick a close-up to widen.") and the opened keyword.
  Focus stays where it was after a miss or skip.
  Guesses are disabled while one is in flight.
  The next keyword's tiles are preloaded once the current ones have loaded.

- [ ] **Step 4: Run** `npm run test:e2e -- e2e/close-ups.spec.ts`, then `npm run lint`, `npm run typecheck`, `npm test`. Expected: all PASS.

- [ ] **Step 5: Check by eye** in a browser (dev server via `preview_start`): 390 px and desktop, light and dark, keyboard only, against the mockup. Fix anything that looks off.

- [ ] **Step 6: Commit** `git commit -m "Rebuild Close-Ups as a one-screen game"`.

---

### Task 5: Docs

**Files:**
- Rename and rewrite: `docs/KEYWORD-COLLAGE.md` to `docs/CLOSE-UPS.md` (game rules as built; keep the content pipeline and "Later" sections)
- Modify: `ASSUMPTIONS.md` (rewrite the "Keyword collage" section as "Close-Ups": fixed order, 5 keywords, the score, no costs, the redirects, the new storage key, the server-side reveal order, the guards against accidental skips)
- Modify: `AGENTS.md` (the status line about the keyword collage)
- Modify: `tools/collage-lab/README.md` and `scripts/import-collage.mts` comments only where they name the game or its costs

- [ ] **Step 1: Write the docs**, one sentence per line, no em dashes.

- [ ] **Step 2: Run** `npm run lint` and `npm test`. Expected: PASS.

- [ ] **Step 3: Commit** `git commit -m "Document Close-Ups"`.

---

### Task 6: Whole-branch check

- [ ] **Step 1: Run** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` (with `NODE_USE_SYSTEM_CA=1` on the owner's work laptop). Expected: all PASS, no flaky retries.
- [ ] **Step 2:** Play one full game in the browser at 390 px and desktop and compare with the mockup.
- [ ] **Step 3:** Report to the owner; do not push or open a PR until they ask.
