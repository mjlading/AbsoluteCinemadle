# Absolute Cinemadle

A collection of movie and series games, starting with a daily movie puzzle.
Each game in development has its design notes in [docs/](docs/).
The product spec is in [docs/SPEC.md](docs/SPEC.md) and decisions taken along the way are in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Set up

Requires Node 24 and Docker (for the local database).

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run db:up                # start Postgres in Docker
npm run db:migrate
npm run db:seed              # schedule the sample puzzle for today
npm run dev
```

In `.env.local`, the TMDB token is the "API Read Access Token" from your own free TMDB account (Settings → API).
The admin password and session secret can be anything locally, and `ANTHROPIC_API_KEY` can stay empty unless you use the admin LLM helpers.
For keyword collage puzzles, run `npm run db:import-collage -- e2e/fixtures/keyword-collage.json` (placeholder images) or pass a file exported by the collage lab.

The game gallery runs at http://localhost:3000, the daily puzzle at http://localhost:3000/daily, and the puzzle editor at http://localhost:3000/admin.

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
  `ANTHROPIC_API_KEY` is set for Production only, so previews can't spend LLM budget outside the production ledger.

Film data and images come from [TMDB](https://www.themoviedb.org/).
This product uses the TMDB API but is not endorsed or certified by TMDB.
