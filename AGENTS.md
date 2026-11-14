# Absolute Cinemadle

Three film games, each with its own route, code folders and design notes:

- Close-Ups (`/close-ups`, docs/CLOSE-UPS.md): a daily; name the film from collages of close-ups that share a keyword.
  `/close-ups` is today's puzzle and `/close-ups/archive` lists earlier days; puzzles are curated in `tools/collage-lab` and loaded with `npm run db:import-collage`.
- Soundbytes (`/soundbytes`, docs/SOUNDBYTES.md): a daily; name the film from lines of dialogue that get easier, then its theme.
  Boards are built on the owner's PC by `tools/soundbytes-lab` and loaded with `npm run db:import-soundbytes`.
- Casting call (`/casting-call`, docs/CASTING-CALL.md): a daily; cross out 8 actors by naming films, within 6 guesses and a 40-second bar.
  `/casting-call` is today's board and `/casting-call/archive` lists earlier days; boards are built by the server from TMDB (`src/lib/casting-call/generate.ts`), by a daily Vercel Cron job or on a day's first visit.

Decisions taken where the owner's briefs are silent live in [ASSUMPTIONS.md](ASSUMPTIONS.md); add to it instead of stopping to ask.
None of the games has an admin editor; the labs make Close-Ups and Soundbytes content, and Casting call builds its own.

## Status

All three games are live at absolutecinemadle.fun (Vercel Hobby with a Neon free database; see "Deploy" in README.md).
Close-Ups and Soundbytes need a new week of content before the last imported day runs out; Casting call fills itself.
Casting call's daily cron job needs `CRON_SECRET` set in the Vercel project.
Collage puzzles and Soundbytes answers are TMDB data: rows older than about 5 months (`synced_at`) must be re-exported or deleted.
Casting call's cron job refreshes its own boards' TMDB data after 5 months.
Update this section as that work lands.

## Stack

Next.js 16 App Router (Cache Components on) + React 19 + TypeScript + Tailwind v4, npm, Node 24.
Postgres via Drizzle (local Docker Postgres for dev, Neon for production and previews).
The repo is public: Vercel's Hobby plan only deploys other people's commits from public repos, so nothing secret may ever be committed.
Pushes to `main` deploy to production; every other branch gets a preview deployment with its own Neon database branch, and `vercel.json` runs migrations before each build.
Player progress lives in localStorage; there are no player accounts.
Commands: see `package.json` scripts; first-time setup is in README.md.
`test:e2e` migrates the `cinemadle_test` database, imports the test fixtures, builds the app and serves it on port 3200.
On networks that intercept TLS (the owner's work laptop), Node needs `NODE_USE_SYSTEM_CA=1` to reach TMDB.

## Hard rules

- Answers never reach the client before they are earned.
  Guesses are validated by the server; the client only gets opaque ids.
  Pictures and clips are served through our own routes under opaque ids, so TMDB file paths, uncropped frames and clip sources never leak.
- Alt text and accessible names never reveal the answer ("Hands, close-up 2 of 4", "Face 3").
- Secrets (TMDB, DB) stay server-side.
  Modules that touch them import `server-only`; never use a `NEXT_PUBLIC_` prefix for them.
- Film audio and video are used only under fair use, in pieces far too short to stand in for the work:
  - Soundbytes dialogue: clips of about 4 seconds cut from official scene clips and trailers on YouTube, the voice separated out with the rest of the soundtrack turned far down.
    They are prepared offline by a local tool on the owner's PC, never on the server, and served from our own route under opaque ids, with no metadata that names the film.
  - Soundbytes' theme clue: a window of the iTunes Search API's 30-second preview, played unaltered from Apple's servers, never rehosted.
- Never host or stream full films, scenes or trailers, and take a clip down promptly when a rights holder asks.
- Every point value lives in `src/config/scoring.ts` and every other game rule number in `src/config/rules.ts`; never hardcode them elsewhere.
- Ask the owner before adding any paid or keyed third-party API, including LLM APIs (the labs use Claude Code agents for judgment calls instead).
- Show the TMDB attribution in the footer; TMDB use is licensed for non-commercial use only.
- TMDB data may be kept for at most 6 months: `synced_at` records when it was fetched, and stale rows must be refreshed or deleted, not kept.

## Neon skills

`.claude/skills/neon` and `.claude/skills/neon-postgres` are Neon's own agent skills, pinned in `skills-lock.json`; don't edit them.
Use them for Postgres connections, migrations, branching and diagnostics; where they disagree with this file, this file wins:

- Keep the existing `postgres` driver and Drizzle setup.
- Don't adopt other Neon products (Auth, Functions, Object Storage, AI Gateway, Realtime, Data API) or Upstash without the owner's approval.
- Local development uses Docker Postgres. Don't create Neon projects, claimable projects or branches yourself: the Vercel integration makes preview branches, and the free plan allows only 10.
- Update the skills (`npx neon skills update`) only when the owner asks, not at the start of every session.
- Never send `neon feedback` or any other report to Neon without asking the owner first.

## Verifying work

- Pure game logic (game state, scoring, title matching, validation) gets Vitest unit tests.
- Player flows get Playwright E2E tests, run on desktop; tag a test `@phone` when it checks layout, touch or a whole game, so it also runs at phone size.
- Don't repeat in E2E what a unit test already pins down; an E2E test checks what the player sees.
- Check UI changes in a real browser at phone width (390px) and desktop, with keyboard only, before calling them done.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
