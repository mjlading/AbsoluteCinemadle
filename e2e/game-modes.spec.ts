import { expect, test } from "@playwright/test";

import { startWarmup } from "./support/game";

test("the gallery shows Close-Ups and no daily puzzle card", async ({ page }) => {
  await page.goto("/");

  const closeUps = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Close-Ups" }) });
  await expect(closeUps).toContainText("New");
  await expect(page.getByRole("heading", { name: "Daily film puzzle" })).toHaveCount(0);
});

test("the Close-Ups card is reachable by keyboard and opens today's puzzle", async ({ page }) => {
  await page.goto("/");
  const closeUps = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Close-Ups" }) });

  await page.keyboard.press("Tab");
  await expect(closeUps).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/close-ups$/);
  // A first visit opens the help over today's puzzle (the E2E server imports the fixture as today's).
  await expect(page.getByRole("dialog", { name: "How to play" })).toBeVisible();
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
