import { expect, test, type Page } from "@playwright/test";

import { POINTS } from "../src/config/scoring";
import { shareText } from "../src/lib/game/share";
import { barcodeButton, bonusAnswers, fetchSolution, filmButton, guess, localDate, startWarmup } from "./support/game";

const guessBox = (page: Page) => page.getByRole("combobox", { name: "Which film is this?" });
const mistakesLeft = (page: Page) => page.getByRole("img", { name: /of 4$/ });

/** Names the first warm-up film (Die Hard), then ends the warm-up. */
async function playWarmup(page: Page) {
  await startWarmup(page);
  await guessBox(page).fill("die hard");
  await guessBox(page).press("Enter");
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();
  await page.getByRole("button", { name: "End the warm-up" }).click();
  await page.getByRole("button", { name: "On to the grid" }).click();
}

test("progress survives a reload, in the warm-up and in the grid", async ({ page }) => {
  await startWarmup(page);
  await guessBox(page).fill("die hard");
  await guessBox(page).press("Enter");
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Mi pobre angelito")).toBeVisible();
  await page.getByRole("button", { name: "End the warm-up" }).click();
  await expect(page.getByRole("heading", { name: "1 of 5 found" })).toBeVisible();
  await page.getByRole("button", { name: "On to the grid" }).click();

  const [a, b, c, d] = await fetchSolution(page);
  await guess(page, a.tileIds);
  await guess(page, [b.tileIds[0], c.tileIds[0], d.tileIds[0], b.tileIds[1]]);

  await page.reload();
  await expect(page.getByRole("navigation", { name: "Rounds" }).getByText("Grid")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByRole("heading", { name: `Solved: ${a.title}` })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tiles" }).getByRole("listitem")).toHaveCount(12);
  await expect(mistakesLeft(page)).toHaveAccessibleName("3 of 4");
});

test("the results add up the day, extend the streak and share it without spoilers", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Yesterday was played too, so today makes a two-day streak.
  await page.addInitScript(() => {
    const key = "cinemadle:history";
    if (window.localStorage.getItem(key)) return;
    const day = new Date();
    day.setDate(day.getDate() - 1);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    window.localStorage.setItem(key, JSON.stringify({ [iso]: { score: 120, won: true } }));
  });

  await playWarmup(page);
  const groups = await fetchSolution(page);
  for (const group of groups) await guess(page, group.tileIds);
  await page.getByRole("button", { name: "On to the bonus" }).click();
  const { bonus, truth } = await bonusAnswers(page);
  for (const [index, b] of bonus.barcodes.entries()) {
    await barcodeButton(page, index).click();
    await filmButton(page, truth.get(b.id)!).click();
  }
  await page.getByRole("button", { name: "Check matches" }).click();
  await page.getByRole("button", { name: "See your results" }).click();

  const total = POINTS.warmup.perCorrectTitle + POINTS.grid.base + 4 * POINTS.barcode.perCorrectMatch;
  const results = page.getByRole("region", { name: `${total} points` });
  await expect(results.getByRole("heading", { name: `${total} points` })).toBeVisible();
  await expect(results).toContainText("Streak: 2 days");
  for (const group of groups) await expect(results).toContainText(group.title);

  await page.getByRole("button", { name: "Copy results" }).click();
  await expect(page.getByText("Copied. Paste it anywhere.")).toBeVisible();
  const expected = shareText({
    date: await localDate(page),
    total,
    warmup: [true, false, false, false, false],
    gridGuesses: groups.map((g) => g.tileIds.map(() => g.tier)),
    bonus: [true, true, true, true],
    hints: { flips: 0, sound: 0, review: 0 },
  });
  // Windows' clipboard turns line breaks into CRLF.
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll("\r\n", "\n")).toBe(expected);
  for (const group of groups) expect(expected).not.toContain(group.title);

  // The results stay put, and today counts once.
  await page.reload();
  await expect(page.getByRole("heading", { name: `${total} points` })).toBeVisible();
  await expect(page.getByText("Streak: 2 days")).toBeVisible();
});
