# Absolute Cinemadle

Three film games: Close-Ups (name the film from close-ups that share a keyword), Casting call (name films to cross out a cast) and Soundbytes (name the film by ear).
Each game has its design notes in [docs/](docs/), and decisions taken along the way are in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Set up

Requires Node 24 and Docker (for the local database).

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run db:up                # start Postgres in Docker
npm run db:migrate
npm run db:import-collage -- e2e/fixtures/keyword-collage.json --days=0,-1      # test puzzles for today and yesterday
npm run db:import-soundbytes -- e2e/fixtures/soundbytes/boards.json --days=0     # a test board for today
npm run dev
```

Casting call needs no import: the first visit to a day without a board builds one from TMDB (a few seconds).

In `.env.local`, the TMDB token is the "API Read Access Token" from your own free TMDB account (Settings → API).
The game gallery runs at http://localhost:3000.
Real Close-Ups and Soundbytes puzzles are made on the owner's PC by the labs in `tools/` (see their READMEs); Casting call's boards are built by the server.

On a network that inspects TLS traffic (common on work laptops), Node cannot reach TMDB until it trusts the system's certificates.
Set `NODE_USE_SYSTEM_CA=1` in your environment (on Windows: `setx NODE_USE_SYSTEM_CA 1`, then open a new terminal).

## Check

```sh
npm run lint
npm run typecheck
npm run format:check
npm test            # unit tests (Vitest)
npm run test:e2e    # browser tests (Playwright); first run: npx playwright install chromium
```

## Working together

- Work on a branch and open a pull request into `main`; each game keeps to its own folders (`src/app/<game>`, `src/components/<game>`, `src/lib/<game>`, `docs/<GAME>.md`).
- Merge with "Create a merge commit", not squash: on Vercel's Hobby plan only commits authored by the account owner deploy.
- Schema changes are Drizzle migrations (`npm run db:generate`). If `main` gained a migration since you branched, merge `main` in and regenerate yours so the numbers don't clash.
- Delete branches once merged: each preview holds a Neon branch, and the free plan allows only 10.

## Deploy

The site runs on Vercel with a Neon Postgres database, connected through Neon's Vercel integration.

- Pushing to `main` deploys https://absolutecinemadle.fun.
- Every other branch gets a preview deployment with its own copy of the database (a Neon branch, deleted with the Git branch).
- Each build runs `npm run db:migrate` first (see `vercel.json`), against the direct connection in `DATABASE_URL_UNPOOLED`.
- Functions run in Frankfurt (`fra1` in `vercel.json`), next to the Neon database (`aws-eu-central-1`).
- Secrets live in the Vercel project's environment variables, never in the repo.
- A Vercel Cron job (`crons` in `vercel.json`, daily at 04:00 UTC, production only) calls `/api/cron/casting-call`, which builds the coming week's Casting call boards.
  It needs `CRON_SECRET` (any long random string) in the project's environment variables; Vercel sends it with the call, and without it the route refuses everyone.
  If a run is missed, the first player of a day without a board gets one built on the spot.

Film data and images come from [TMDB](https://www.themoviedb.org/).
This product uses the TMDB API but is not endorsed or certified by TMDB.
