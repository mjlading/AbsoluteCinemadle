# Absolute Cinemadle

A collection of movie and series games, starting with a daily movie puzzle.
Keyword collage is a preview while its image clues are being planned; its design is in [docs/KEYWORD-COLLAGE.md](docs/KEYWORD-COLLAGE.md).
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
