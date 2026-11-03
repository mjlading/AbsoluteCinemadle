# Absolute Cinemadle

Daily movie puzzle web app: a back-translated-titles warm-up, a 4×4 image grid (Connections-style, one film per group) and a color-barcode bonus round.
The full brief is [docs/SPEC.md](docs/SPEC.md); read it before starting any phase.
Decisions taken where the spec is ambiguous live in [ASSUMPTIONS.md](ASSUMPTIONS.md); add to it instead of stopping to ask.

## Status

All five build phases are done (grid; database, TMDB and admin editor at `/admin`; warm-up with LLM back-translations; barcode bonus round; hints, scoring, results, streaks and saved progress).
Hosting is Vercel (Hobby) with a Neon (free) database at absolutecinemadle.fun; see "Deploy" in README.md.
Before launch: a refresh job for `films` rows older than about 5 months, and real puzzles.
Update this section as that work lands.
Phases are listed in SPEC.md under "Build phases"; owner additions (posters, review hint, animations) are listed there too.

## Stack

Next.js 16 App Router (Cache Components on) + React 19 + TypeScript + Tailwind v4, npm, Node 24.
Postgres via Drizzle (local Docker Postgres for dev, Neon for production and previews).
The repo is public: Vercel's Hobby plan only deploys other people's commits from public repos, so nothing secret may ever be committed.
Pushes to `main` deploy to production; every other branch gets a preview deployment with its own Neon database branch, and `vercel.json` runs migrations before each build.
Player progress lives in localStorage; there are no player accounts.
Commands: see `package.json` scripts; first-time setup is in README.md.
`test:e2e` migrates and seeds the `cinemadle_test` database, builds the app and serves it on port 3200.
Players read puzzles through `src/lib/puzzle/source.ts` (cached, date-gated); the admin edits them through `src/lib/admin/puzzles.ts`.
On networks that intercept TLS (the owner's work laptop), Node needs `NODE_USE_SYSTEM_CA=1` to reach TMDB.

## Hard rules

- Answers never reach the client before they are earned.
  Guesses are validated by the server; the client only gets opaque tile ids.
  Tile images are served through our own image route under opaque ids, so TMDB file paths and uncropped backdrops never leak (prop crops are rendered server-side).
- Secrets (TMDB, Anthropic, DB, admin password) stay server-side.
  Modules that touch them import `server-only`; never use a `NEXT_PUBLIC_` prefix for them.
- Tile alt text never reveals the answer ("Tile 7, prop close-up"); a flipped label is announced to screen readers.
- Never download, rehost or stream film video or audio.
  Sound hints use a visible YouTube embed with start/end times only.
- Every point value lives in the single scoring config file; never hardcode scores elsewhere.
- LLM use: model `claude-haiku-5-5` only, server-side, admin-triggered only.
  Every call goes through the spend guard, which records cost in the DB and refuses calls once the USD 10 lifetime cap would be exceeded.
  Do not add an LLM call site that bypasses it, and do not change the model or cap without the owner's approval.
  On Vercel the Anthropic key is set for Production only: each preview's Neon branch keeps its own spend ledger, so a key there would let total spend pass the cap.
- Ask the owner before adding any new paid or keyed third-party API.
- Show the TMDB attribution in the footer; TMDB use is licensed for non-commercial use only.
- TMDB data may be kept for at most 6 months: `films.synced_at` records when it was fetched, and stale rows must be refreshed, not kept.

## Verifying work

- Pure game logic (grid state, scoring, fuzzy matching, validation, palette extraction) gets Vitest unit tests.
- Player flows get Playwright E2E tests.
- Check UI changes in a real browser at phone width (390px) and desktop, with keyboard only, before calling them done.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
