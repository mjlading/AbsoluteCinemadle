import { expect, test, type Page } from "@playwright/test";

import type { PublicPuzzle, SolvedGroup } from "../src/lib/puzzle/types";
import { localDate, skipToGrid } from "./support/game";

/** Opens the game on the grid and fetches the answers out of band, so tests can play deliberately. */
async function openGame(page: Page): Promise<SolvedGroup[]> {
  await skipToGrid(page);
  const response = await page.request.get(`/api/puzzles/${await localDate(page)}/solution`);
  return ((await response.json()) as { groups: SolvedGroup[] }).groups;
}

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"] .tile-face`);

async function guess(page: Page, tileIds: string[]) {
  const deselect = page.getByRole("button", { name: "Deselect all" });
  if (await deselect.isEnabled()) await deselect.click();
  for (const id of tileIds) await tile(page, id).click();
  await page.getByRole("button", { name: "Submit" }).click();
  // The board is busy while the server checks the guess and the result animates.
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mistakesLeft = (page: Page) => page.getByRole("img", { name: /of 4$/ });

test("a correct group collapses into a banner with the film title and year", async ({ page }) => {
  const [jaws] = await openGame(page);
  await guess(page, jaws.tileIds);

  const films = page.getByRole("list", { name: "Films" });
  await expect(films.getByRole("heading", { name: "Solved: Jaws" })).toBeVisible();
  await expect(films).toContainText("1975");
  await expect(page.getByRole("list", { name: "Tiles" }).getByRole("listitem")).toHaveCount(12);
  await expect(mistakesLeft(page)).toHaveAccessibleName("4 of 4");
});

test("one away costs a mistake, keeps the selection and blocks repeat guesses", async ({ page }) => {
  const [jaws, , raiders] = await openGame(page);
  const nearMiss = [...jaws.tileIds.slice(0, 3), raiders.tileIds[0]];
  await guess(page, nearMiss);

  await expect(page.getByText("One away", { exact: true })).toBeVisible();
  await expect(mistakesLeft(page)).toHaveAccessibleName("3 of 4");
  await expect(page.locator(".tile-face[aria-pressed=true]")).toHaveCount(4);

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Already guessed", { exact: true })).toBeVisible();
  await expect(mistakesLeft(page)).toHaveAccessibleName("3 of 4");
});

test("the fourth mistake ends the round and reveals every film", async ({ page }) => {
  const [a, b, c, d] = await openGame(page);
  await guess(page, a.tileIds);
  for (let i = 0; i < 4; i++) {
    await guess(page, [b.tileIds[i], c.tileIds[i], d.tileIds[i], i < 3 ? b.tileIds[i + 1] : c.tileIds[0]]);
  }

  await expect(page.getByRole("heading", { name: "Out of mistakes" })).toBeFocused();
  const films = page.getByRole("list", { name: "Films" });
  await expect(films.getByRole("listitem")).toHaveCount(4);
  await expect(films.getByRole("heading", { name: /^Revealed: / })).toHaveCount(3);
  await expect(page.getByRole("list", { name: "Tiles" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
});

test("a perfect grid is absolute cinema", async ({ page }) => {
  const groups = await openGame(page);
  for (const group of groups) await guess(page, group.tileIds);

  await expect(page.getByRole("heading", { name: "Absolute cinema." })).toBeFocused();
  await expect(page.getByText("All 4 films, no mistakes, 0 labels revealed.")).toBeVisible();
});

test("finding all four films after a mistake wins the round", async ({ page }) => {
  const [a, b, c, d] = await openGame(page);
  await guess(page, [a.tileIds[0], b.tileIds[0], c.tileIds[0], d.tileIds[0]]);
  for (const group of [a, b, c, d]) await guess(page, group.tileIds);

  await expect(page.getByRole("heading", { name: "You found all 4 films" })).toBeFocused();
  await expect(page.getByText("1 mistake, 0 labels revealed.")).toBeVisible();
  const films = page.getByRole("list", { name: "Films" });
  await expect(films.getByRole("listitem")).toHaveCount(4);
});

test("revealing a label shows it on the tile and announces it", async ({ page }) => {
  const groups = await openGame(page);
  const tileId = groups[3].tileIds[0];
  const labelResponse = await page.request.post(`/api/puzzles/${await localDate(page)}/labels`, { data: { tileId } });
  const { label } = (await labelResponse.json()) as { label: string };

  await page
    .locator(`[data-tile-id="${tileId}"]`)
    .getByRole("button", { name: /^Inspect tile/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText(label);
  await dialog.getByRole("button", { name: /Reveal label/ }).click();
  await expect(dialog).toContainText(label);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(tile(page, tileId)).toContainText(label);
  await expect(tile(page, tileId)).toHaveAccessibleName(new RegExp(`label: ${escapeRegExp(label)}$`));
  await expect(page.locator("[aria-live=polite]")).toContainText(`Label revealed: ${label}`);
});

test("the grid is fully playable with a keyboard", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard play is a desktop concern.");
  await openGame(page);
  const tiles = page.locator(".tile-face");

  await page.getByRole("button", { name: "How to play" }).focus();
  await page.keyboard.press("Tab");
  await expect(tiles.nth(0)).toBeFocused();

  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(tiles.nth(5)).toBeFocused();
  await expect(page.locator(".tile-face[aria-pressed=true]")).toHaveCount(3);

  await page.keyboard.press("i");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tiles.nth(5)).toBeFocused();

  // Tab leaves the grid in one step, thanks to the roving tab stop.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Shuffle" })).toBeFocused();
});

test("pressing and holding a tile opens the larger view without selecting it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Long press is a touch interaction.");
  await openGame(page);
  const face = page.locator(".tile-face").first();
  const box = (await face.boundingBox())!;
  const point = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, button: 0, pointerType: "touch" };

  await face.dispatchEvent("pointerdown", point);
  await page.waitForTimeout(600);
  await face.dispatchEvent("pointerup", point);
  await face.dispatchEvent("click", point);

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(face).toHaveAttribute("aria-pressed", "false");
});

test("the puzzle payload carries no answers", async ({ page }) => {
  const puzzleResponse = page.waitForResponse((r) => /\/api\/puzzles\/[\d-]+$/.test(r.url()));
  const groups = await openGame(page);
  const body = await (await puzzleResponse).text();

  const puzzle = JSON.parse(body) as PublicPuzzle;
  expect(puzzle.tiles).toHaveLength(16);
  for (const group of groups) expect(body).not.toContain(group.title);
  const warmup = await page.request.get(`/api/puzzles/${await localDate(page)}/warmup/solution`);
  for (const answer of ((await warmup.json()) as { answers: { title: string }[] }).answers) {
    expect(body).not.toContain(answer.title);
  }
  expect(body).not.toMatch(/film|tmdb|tier|label|answer/i);
  await expect(page.locator("img[alt]").first()).toHaveAttribute("alt", /^Tile \d+, /);
});
