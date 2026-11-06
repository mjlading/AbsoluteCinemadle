import { expect, test, type Page } from "@playwright/test";

// The fixture puzzle (e2e/fixtures/keyword-collage.json): Hands free, then Doors (hard, 100), Food (medium, 200),
// Mouths and Signs (easy, 350 each).
async function openPuzzle(page: Page) {
  await page.goto("/keyword-collage");
  await page.getByRole("link", { name: /Test puzzle/ }).click();
  await expect(page.getByRole("heading", { name: "Hands" })).toBeVisible();
}

const points = (page: Page) => page.getByRole("definition").first();
const guessBox = (page: Page) => page.getByRole("combobox", { name: "Movie title" });

async function guess(page: Page, title: string) {
  await guessBox(page).fill(title);
  await guessBox(page).press("Enter");
}

test("a game: free collage, an unlock, a wrong guess, enhance, then the right guess", async ({ page }) => {
  await openPuzzle(page);
  await expect(page.getByRole("img", { name: /^Hands, close-up \d of 4$/ })).toHaveCount(4);
  await expect(points(page)).toHaveText("1000");

  // The answer is nowhere on the page or in what the client got.
  const puzzle = await (await page.request.get("/api/collage/fixture1")).text();
  expect(puzzle).not.toContain("Back to the Future");
  await expect(page.getByText("Back to the Future")).toHaveCount(0);

  await page.getByRole("button", { name: /Food.*Unlock/ }).click();
  await expect(page.getByRole("heading", { name: "Food" })).toBeFocused();
  await expect(page.getByRole("img", { name: /^Food, close-up/ })).toHaveCount(4);
  await expect(points(page)).toHaveText("800");

  await guess(page, "Jaws");
  await expect(page.getByRole("status")).toHaveText('Not "Jaws". 5 guesses left.');
  await expect(points(page)).toHaveText("750");
  await guess(page, "jaws");
  await expect(page.getByRole("status")).toHaveText('You already tried "jaws".');
  await expect(points(page)).toHaveText("750");

  await page.getByRole("button", { name: "Enhance a close-up" }).click();
  await page.getByRole("button", { name: "Enhance Hands, close-up 2 of 4" }).click();
  await expect(page.getByRole("img", { name: "Hands, close-up 2 of 4, enhanced" })).toBeVisible();
  await expect(page.getByText("Enhance used.")).toBeVisible();

  await guess(page, "back to the futur");
  await expect(page.getByRole("heading", { name: "Back to the Future" })).toBeVisible();
  await expect(page.getByText("You got it")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The full frames" })).toBeVisible();
  // Every keyword's collage is shown at the end, the unopened ones too.
  await expect(page.getByRole("img", { name: /full frame$/ })).toHaveCount(20);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Back to the Future" })).toBeVisible();
  await page.getByRole("link", { name: "All puzzles" }).click();
  await expect(page.getByRole("link", { name: /Test puzzle/ })).toContainText("Solved");
});

test("giving up reveals the film and scores nothing", async ({ page }) => {
  await openPuzzle(page);
  await page.getByRole("button", { name: "Give up and show the film" }).click();
  await expect(page.getByText("You gave up")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Back to the Future" })).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Points" }).locator("+ dd")).toHaveText("0");
});

test("keywords the player can't afford are disabled, and the last wrong guess ends the game", async ({ page }) => {
  await openPuzzle(page);
  await page.getByRole("button", { name: /Mouths.*Unlock/ }).click();
  await page.getByRole("button", { name: /Food.*Unlock/ }).click();
  for (const wrong of ["Alien", "Heat", "Rocky", "Up", "Big"]) await guess(page, wrong);
  // 1000 - 350 - 200 - 5 x 50 = 200 left: Doors (100) still fits, Signs (350) does not.
  await expect(points(page)).toHaveText("200");
  await expect(page.getByRole("button", { name: /Doors.*Unlock/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Signs.*not enough left/ })).toBeDisabled();
  await guess(page, "Cars");
  await expect(page.getByText("Out of guesses")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Back to the Future" })).toBeVisible();
});

test("the page has no horizontal scroll", async ({ page }) => {
  await openPuzzle(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
