# Absolute Cinemadle

A daily movie puzzle: sort sixteen frames into the four films they come from.
The product spec is in [docs/SPEC.md](docs/SPEC.md) and decisions taken along the way are in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Develop

Requires Node 24.

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Check

```sh
npm run lint
npm run typecheck
npm test            # unit tests (Vitest)
npm run test:e2e    # browser tests (Playwright); first run: npx playwright install chromium
```

Film data and images will come from [TMDB](https://www.themoviedb.org/).
This product uses the TMDB API but is not endorsed or certified by TMDB.
