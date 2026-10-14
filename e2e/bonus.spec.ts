import { expect, test, type Page } from "@playwright/test";

import {
  bonusAnswers as trueFilms,
  barcodeButton as barcode,
  fetchSolution,
  filmButton as film,
  guess,
  skipToGrid,
} from "./support/game";

/** Plays the grid to the end (won, or lost after four mistakes) and opens the bonus round. */
async function openBonus(page: Page, { win }: { win: boolean }) {
  await skipToGrid(page);
  const groups = await fetchSolution(page);
  const guesses = win
    ? groups.map((g) => g.tileIds)
    : [0, 1, 2, 3].map((i) => [groups[0].tileIds[i], groups[1].tileIds[i], groups[2].tileIds[i], groups[3].tileIds[i]]);
  for (const tileIds of guesses) await guess(page, tileIds);
  await page.getByRole("button", { name: "On to the bonus" }).click();
  await expect(page.getByRole("list", { name: "Barcodes" }).getByRole("listitem")).toHaveCount(4);
}

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
