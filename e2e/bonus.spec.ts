import { expect, test, type Page } from "@playwright/test";

import type { BonusResult, PublicBonus, SolvedGroup } from "../src/lib/puzzle/types";
import { localDate, skipToGrid } from "./support/game";

async function apiBase(page: Page) {
  return `/api/puzzles/${await localDate(page)}`;
}

/** Plays the grid to the end (won, or lost after four mistakes) and opens the bonus round. */
async function openBonus(page: Page, { win }: { win: boolean }) {
  await skipToGrid(page);
  const base = await apiBase(page);
  const { groups } = (await (await page.request.get(`${base}/solution`)).json()) as { groups: SolvedGroup[] };
  const guesses = win
    ? groups.map((g) => g.tileIds)
    : [0, 1, 2, 3].map((i) => [groups[0].tileIds[i], groups[1].tileIds[i], groups[2].tileIds[i], groups[3].tileIds[i]]);
  for (const tileIds of guesses) {
    const deselect = page.getByRole("button", { name: "Deselect all" });
    if (await deselect.isEnabled()) await deselect.click();
    for (const id of tileIds) await page.locator(`[data-tile-id="${id}"] .tile-face`).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "On to the bonus" }).click();
  await expect(page.getByRole("list", { name: "Barcodes" }).getByRole("listitem")).toHaveCount(4);
}

/** The true film for each barcode, as the check endpoint reports it (the client never knows it up front). */
async function trueFilms(page: Page): Promise<{ bonus: PublicBonus; truth: Map<string, string> }> {
  const base = await apiBase(page);
  const bonus = (await (await page.request.get(`${base}/bonus`)).json()) as PublicBonus;
  const response = await page.request.post(`${base}/bonus/check`, { data: { matches: {} } });
  const { results } = (await response.json()) as { results: BonusResult[] };
  const titles = new Map(bonus.films.map((f) => [f.filmId, f.title]));
  return { bonus, truth: new Map(results.map((r) => [r.barcodeId, titles.get(r.filmId)!])) };
}

const barcode = (page: Page, index: number) =>
  page.getByRole("list", { name: "Barcodes" }).getByRole("button", { name: new RegExp(`^Barcode ${index + 1},`) });
const film = (page: Page, title: string) =>
  page.getByRole("list", { name: "Films" }).getByRole("button", { name: new RegExp(`^${title}`) });

test("barcodes are matched to the day's films by tapping", async ({ page }) => {
  await openBonus(page, { win: true });
  const { bonus, truth } = await trueFilms(page);
  await expect(page.getByRole("button", { name: "Check matches" })).toBeDisabled();

  for (const [index, b] of bonus.barcodes.entries()) {
    // Alternate the order: barcode first, then film first.
    if (index % 2 === 0) {
      await barcode(page, index).click();
      await film(page, truth.get(b.id)!).click();
    } else {
      await film(page, truth.get(b.id)!).click();
      await barcode(page, index).click();
    }
    await expect(barcode(page, index)).toHaveAccessibleName(`Barcode ${index + 1}, matched with ${truth.get(b.id)}`);
  }

  await page.getByRole("button", { name: "Check matches" }).click();
  await expect(page.getByRole("heading", { name: "4 of 4 matched" })).toBeFocused();
});

test("wrong matches show the right film, and the bonus follows a lost grid too", async ({ page }) => {
  await openBonus(page, { win: false });
  const { bonus, truth } = await trueFilms(page);
  // Shift every film one barcode along, so all four are wrong.
  for (const [index] of bonus.barcodes.entries()) {
    const wrong = truth.get(bonus.barcodes[(index + 1) % bonus.barcodes.length].id)!;
    await barcode(page, index).click();
    await film(page, wrong).click();
  }
  await page.getByRole("button", { name: "Check matches" }).click();
  await expect(page.getByRole("heading", { name: "0 of 4 matched" })).toBeVisible();
  await expect(page.getByText(`It was ${truth.get(bonus.barcodes[0].id)}`)).toBeVisible();
});

test("a film can be dragged onto a barcode", async ({ page, isMobile }) => {
  test.skip(isMobile, "Dragging is the desktop way in; touch players tap.");
  await openBonus(page, { win: true });
  const { bonus, truth } = await trueFilms(page);
  const title = truth.get(bonus.barcodes[2].id)!;
  await film(page, title).dragTo(barcode(page, 2));
  await expect(barcode(page, 2)).toHaveAccessibleName(`Barcode 3, matched with ${title}`);
});
