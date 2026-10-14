# Assumptions

Decisions taken where [docs/SPEC.md](docs/SPEC.md) is ambiguous or silent.
Each entry says what was decided and why, so it can be revisited.

## General
- The game is named "Absolute Cinemadle", after the repository folder.
- The LLM is `claude-haiku-4-5` ($1 input / $5 output per million tokens), because the requested "Haiku 5.5" does not exist and Haiku 4.5 is the cheapest current model.
- The USD 10 LLM cap is a lifetime cap enforced by a ledger table: before each call, the worst-case cost (input tokens plus `max_tokens` of output) must fit in the remaining budget.
  A spend limit on the Anthropic Console workspace is recommended as a second, independent backstop.
- Package manager is npm, because pnpm is not installed and npm needs no extra setup.
- Drizzle is the ORM: typed schema in TypeScript, plain SQL migrations, works with any Postgres including Supabase.
- Local development uses Postgres in Docker; production uses a Supabase Postgres connection string.

## Puzzle day and answer protection
- A puzzle day is the player's local calendar date (`YYYY-MM-DD`), sent by the client.
  The server refuses dates later than the current UTC date plus one day, since local dates run from UTC-12 to UTC+14 and anything later would be peeking at a future puzzle.
- The solution route answers at any time, because whether a round is over is only known in the browser.
  Calling it directly is the same as giving up, so it only spoils the caller's own game.
- Guesses are checked by a server route that returns only "correct" (with that group's film and tiles), "one away" or "wrong".
  Mistake, flip and hint counts are tracked in localStorage, so a determined player can only cheat their own score, which is acceptable without accounts.
- Tile images go through an image route keyed by an opaque per-tile id, which also renders prop crops server-side.
  A CSS-only crop would ship the full backdrop to the browser and give the prop away.

## Main grid rules
- The round ends on the 4th mistake, as in Connections.
- A "one away" guess counts as a mistake.
- Re-submitting a set already guessed wrong is rejected with an "already guessed" message and costs nothing.
- Flipping a tile costs points once; it stays flipped for the rest of the day.
- Flipping happens in the larger tile view, because a tap already selects and a long press opens that view.
  The revealed label then sits on a strip along the bottom of the tile, so the picture stays visible.
- The number in a tile's alt text ("Tile 7") is its starting position and stays with the tile through shuffles and solves.
- Players can shuffle the remaining tiles, as in Connections.
- Taps are ignored while a guess is being checked or its result is animating.
- Tier colors follow the dyes of color film plus white film-can tape: 1 cyan, 2 yellow, 3 magenta, 4 white.
