import { defineConfig, devices } from "@playwright/test";

import { E2E_DATABASE_URL } from "./e2e/support/env";

// A production build on its own port and its own database: no on-demand compiling,
// no hot reload and no development data to make results flaky.
const PORT = Number(process.env.E2E_PORT ?? 3200);

// The TMDB token (for Casting call's cast and the film search) lives in .env.local; the app server loads it itself.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file: TMDB-backed tests skip themselves.
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Every test runs on desktop; on a phone only those tagged @phone (layout, touch and whole games), since the
  // rest check logic that doesn't change with the screen.
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Idle connections stay open for two minutes: with Node's default of 5 seconds, a test's
    // page.request could reuse a socket just as the server closed it (ECONNRESET).
    command: `npm run db:migrate && npm run db:import-collage -- e2e/fixtures/keyword-collage.json --days=0,-1 && npm run db:import-soundbytes -- e2e/fixtures/soundbytes/boards.json --days=0 && npm run build && npm run start -- --port ${PORT} --keepAliveTimeout 120000`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
});
