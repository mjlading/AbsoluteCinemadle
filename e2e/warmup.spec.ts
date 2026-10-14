import { expect, test, type Page } from "@playwright/test";

import { startWarmup } from "./support/game";

const hasTmdb = Boolean(process.env.TMDB_READ_ACCESS_TOKEN);
const guessBox = (page: Page) => page.getByRole("combobox", { name: "Which film is this?" });
/** What screen readers hear; the visual feedback line says the same. */
const announcement = (page: Page) => page.locator("section[aria-labelledby=warmup-heading] [aria-live=polite]");

test("the warm-up shows a foreign title and its literal translation, and takes forgiving answers", async ({ page }) => {
  await startWarmup(page);
  await expect(page.getByText("Spanish, Mexico")).toBeVisible();
  await expect(page.getByText("Duro de matar")).toBeVisible();
  await expect(page.getByText("“Hard to Kill”")).toBeVisible();

  await guessBox(page).fill("Speed");
  await page.getByRole("button", { name: "Guess" }).click();
  await expect(announcement(page)).toHaveText("Not that one.");

  // A typo and missing capitals still count.
  await guessBox(page).fill("die hrad");
  await page.getByRole("button", { name: "Guess" }).click();
  await expect(announcement(page)).toHaveText("Correct: Die Hard (1988).");
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();

  await guessBox(page).fill("home alone");
  await guessBox(page).press("Enter");
  await expect(page.getByText("Vaselina")).toBeVisible();

  // Skipping sends the card to the back; ending reveals what was missed.
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByText("Der Stadtneurotiker")).toBeVisible();
  await page.getByRole("button", { name: "End the warm-up" }).click();

  await expect(page.getByRole("heading", { name: "2 of 5 found" })).toBeFocused();
  const grease = page.getByRole("listitem").filter({ hasText: "Vaselina" });
  await expect(grease).toContainText("Grease (1978)");
  await expect(grease).toContainText("Missed");
  await expect(page.getByRole("listitem").filter({ hasText: "Duro de matar" })).toContainText("Found");

  await page.getByRole("button", { name: "On to the grid" }).click();
  await expect(page.getByRole("list", { name: "Tiles" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Rounds" }).getByText("Grid")).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("the clock ends the warm-up after 60 seconds", async ({ page }) => {
  await startWarmup(page);
  await expect(page.getByRole("timer", { name: "60 seconds left" })).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole("heading", { name: "0 of 5 found" })).toBeVisible();
  await expect(page.getByText("Eternal Sunshine of the Spotless Mind (2004)")).toBeVisible();
});

test("picking a suggestion answers straight away", async ({ page }) => {
  test.skip(!hasTmdb, "Suggestions come from TMDB.");
  await startWarmup(page);
  await guessBox(page).fill("die ha");
  await page.getByRole("option", { name: /^Die Hard\s*1988$/ }).click();
  await expect(announcement(page)).toHaveText("Correct: Die Hard (1988).");
});
