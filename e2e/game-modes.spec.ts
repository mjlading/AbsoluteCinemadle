import { expect, test } from "@playwright/test";

import { startWarmup } from "./support/game";

test("the gallery shows Close-Ups and no daily puzzle card", async ({ page }) => {
  await page.goto("/");

  const closeUps = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Close-Ups" }) });
  await expect(closeUps).toContainText("In development");
  await expect(page.getByRole("heading", { name: "Daily film puzzle" })).toHaveCount(0);
});

test("the Close-Ups page is reachable by keyboard and lists its puzzles", async ({ page }) => {
  await page.goto("/");
  const closeUps = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Close-Ups" }) });

  await page.keyboard.press("Tab");
  await expect(closeUps).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/close-ups$/);
  await expect(page.getByRole("heading", { name: "Close-Ups" })).toBeVisible();
  await expect(page.getByText("These are illustrations, not film or series images.")).toBeVisible();
  // The E2E server reads the fixture puzzle file; without one the page says it is a preview.
  await expect(page.getByRole("link", { name: /Test puzzle/ })).toBeVisible();
});

test("the old keyword collage addresses redirect", async ({ page }) => {
  await page.goto("/keyword-collage/fixture1");
  await expect(page).toHaveURL(/\/close-ups\/fixture1$/);
  await page.goto("/keyword-collage");
  await expect(page).toHaveURL(/\/close-ups$/);
});

test("daily progress survives a trip through the gallery", async ({ page }) => {
  await startWarmup(page);
  const guess = page.getByRole("combobox", { name: "Which film is this?" });
  await guess.fill("die hard");
  await guess.press("Enter");
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();

  await page.getByRole("link", { name: "All games" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/daily");
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();
});
