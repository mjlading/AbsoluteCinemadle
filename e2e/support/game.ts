import { expect, type Page } from "@playwright/test";

/** The player's local date, read from the browser the same way the game does. */
export async function localDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
}

/**
 * Opens today's game with a controllable clock and starts the warm-up,
 * skipping the 3-second film leader.
 */
export async function startWarmup(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto("/");
  // Generous: the first visit to a freshly started server also warms its caches.
  await page.getByRole("button", { name: "Start the clock" }).click({ timeout: 15_000 });
  await expect(page.getByRole("timer", { name: /^Starting in/ })).toBeVisible();
  await page.clock.fastForward(3_100);
  await expect(page.getByRole("combobox", { name: "Which film is this?" })).toBeVisible();
}

/** Plays straight through the warm-up without answering, ending on the grid. */
export async function skipToGrid(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start the clock" })).toBeVisible({ timeout: 15_000 });
  await endWarmupAndOpenGrid(page);
  await expect(page.getByRole("list", { name: "Tiles" }).getByRole("listitem")).toHaveCount(16);
}

/** From the warm-up intro of a page with an installed clock: start, give up, move on to the grid. */
export async function endWarmupAndOpenGrid(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Start the clock" }).click();
  await page.clock.fastForward(3_100);
  await page.getByRole("button", { name: "End the warm-up" }).click();
  await page.getByRole("button", { name: "On to the grid" }).click();
  await expect(page.getByRole("list", { name: "Tiles" })).toBeVisible();
}
