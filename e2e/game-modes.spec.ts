import { expect, test } from "@playwright/test";

import { startWarmup } from "./support/game";

test("the gallery links to the existing daily puzzle and back", async ({ page }) => {
  await page.goto("/");

  const daily = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Daily film puzzle" }) });
  const collage = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Keyword collage" }) });
  await expect(daily).toContainText("Play now");
  await expect(collage).toContainText("In development");

  await daily.click();
  await expect(page).toHaveURL(/\/daily$/);
  await expect(page.getByRole("button", { name: "Start the clock" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "All games" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(daily).toBeVisible();
});

test("the collage preview is reachable by keyboard and does not pretend to be playable", async ({ page }) => {
  await page.goto("/");
  const daily = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Daily film puzzle" }) });
  const collage = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Keyword collage" }) });

  await page.keyboard.press("Tab");
  await expect(daily).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(collage).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/keyword-collage$/);
  await expect(page.getByRole("heading", { name: "Keyword collage" })).toBeVisible();
  await expect(page.getByText("These are illustrations, not film or series images.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Movie or series" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Guess" })).toBeDisabled();
});

test("daily progress survives a trip through the gallery", async ({ page }) => {
  await startWarmup(page);
  const guess = page.getByRole("combobox", { name: "Which film is this?" });
  await guess.fill("die hard");
  await guess.press("Enter");
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();

  await page.getByRole("link", { name: "All games" }).click();
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Daily film puzzle" }) })
    .click();
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();
});
