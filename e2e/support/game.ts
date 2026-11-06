import { expect, type Page } from "@playwright/test";

import type { BonusResult, PublicBonus, SolvedGroup } from "../../src/lib/puzzle/types";

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
  await page.goto("/daily");
  // Generous: the first visit to a freshly started server also warms its caches.
  await page.getByRole("button", { name: "Start the clock" }).click({ timeout: 15_000 });
  await expect(page.getByRole("timer", { name: /^Starting in/ })).toBeVisible();
  await page.clock.fastForward(3_100);
  await expect(page.getByRole("combobox", { name: "Which film is this?" })).toBeVisible();
}

/** Plays straight through the warm-up without answering, ending on the grid. */
export async function skipToGrid(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto("/daily");
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

/** The day's answers, fetched out of band so tests can play deliberately. */
export async function fetchSolution(page: Page): Promise<SolvedGroup[]> {
  const response = await page.request.get(`/api/puzzles/${await localDate(page)}/solution`);
  return ((await response.json()) as { groups: SolvedGroup[] }).groups;
}

export const tileFace = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"] .tile-face`);

/** Selects exactly these tiles, submits them and waits for the board to settle. */
export async function guess(page: Page, tileIds: string[]): Promise<void> {
  const deselect = page.getByRole("button", { name: "Deselect all" });
  if (await deselect.isEnabled()) await deselect.click();
  for (const id of tileIds) await tileFace(page, id).click();
  await page.getByRole("button", { name: "Submit" }).click();
  // The board is busy while the server checks the guess and the result animates.
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
}

/** The bonus round's barcodes, and the film title each one truly belongs to (from the check endpoint). */
export async function bonusAnswers(page: Page): Promise<{ bonus: PublicBonus; truth: Map<string, string> }> {
  const base = `/api/puzzles/${await localDate(page)}`;
  const bonus = (await (await page.request.get(`${base}/bonus`)).json()) as PublicBonus;
  const response = await page.request.post(`${base}/bonus/check`, { data: { matches: {} } });
  const { results } = (await response.json()) as { results: BonusResult[] };
  const titles = new Map(bonus.films.map((f) => [f.filmId, f.title]));
  return { bonus, truth: new Map(results.map((r) => [r.barcodeId, titles.get(r.filmId)!])) };
}

export const barcodeButton = (page: Page, index: number) =>
  page.getByRole("list", { name: "Barcodes" }).getByRole("button", { name: new RegExp(`^Barcode ${index + 1},`) });
export const filmButton = (page: Page, title: string) =>
  page.getByRole("list", { name: "Films" }).getByRole("button", { name: new RegExp(`^${title}`) });
