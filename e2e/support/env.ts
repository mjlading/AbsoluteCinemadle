/** Settings shared by the Playwright config and the tests. */
/** Overridable, so checkouts running their suites at once can each have their own database. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://cinemadle:cinemadle@localhost:5433/cinemadle_test";
export const E2E_ADMIN_PASSWORD = "e2e-admin-password";
