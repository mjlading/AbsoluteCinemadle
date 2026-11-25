import { expect, test, type Page } from "@playwright/test";

// Played on today's Ratings Cliff fixture (e2e/fixtures/ratings-cliff.json), which needs no TMDB.
const ANSWERS = ["The Long Count", "The Understudies", "Second Wind", "The Tollkeepers", "Ferris Point"];

/** A name no other test (or earlier run against the same database) has used. */
const freshName = () => `E2E ${Math.random().toString(36).slice(2, 10)}`;

async function finishRatingsCliff(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("ratings-cliff:help-seen", "true"));
  await page.goto("/ratings-cliff");
  await expect(page.getByRole("heading", { name: /Series 1 of 5/ })).toBeVisible({ timeout: 15_000 });
  for (const title of ANSWERS) {
    await page
      .getByRole("group", { name: "Which series is this?" })
      .getByRole("button", { name: title, exact: true })
      .click();
    await page.getByRole("button", { name: /^(Next series|See your score)$/ }).click();
  }
}

test("a finished daily can be posted under a name, listed for that day and in the all-time totals", async ({
  page,
  browser,
}) => {
  const name = freshName();
  await finishRatingsCliff(page);
  const board = page.getByRole("region", { name: "Leaderboard" });
  await board.getByLabel("Your name").fill(name);
  await board.getByRole("button", { name: "Post" }).click();
  await expect(board.getByRole("list", { name: "Results for this day" })).toContainText(`${name}: 5/5 (5 points)`);
  await expect(board.getByLabel("Your name")).toHaveCount(0);

  // Another browser can't post under a name this one holds.
  const other = await browser.newPage();
  await finishRatingsCliff(other);
  const otherBoard = other.getByRole("region", { name: "Leaderboard" });
  await otherBoard.getByLabel("Your name").fill(name.toUpperCase());
  await otherBoard.getByRole("button", { name: "Post" }).click();
  await expect(otherBoard.getByRole("alert")).toContainText("already taken");
  await other.close();

  await page.goto("/leaderboard");
  await expect(
    page.getByRole("region", { name: "Ratings Cliff" }).getByRole("row", { name: new RegExp(name) }),
  ).toBeVisible();
});

test("the server scores the moves itself and refuses an unfinished game", async ({ request }) => {
  const today = new Date().toLocaleDateString("sv");
  const { id } = await (await request.get(`/api/ratings-cliff/day/${today}`)).json();
  const token = `e2e${Math.random().toString(36).slice(2)}aaaaaaaaaaaaaaaaaaaa`;
  const post = (picks: string[]) =>
    request.post("/api/leaderboard", {
      data: { boardId: id, name: freshName(), token, score: 999, moves: { game: "ratings-cliff", picks } },
    });

  expect((await post(["x", "y"])).status()).toBe(400);
  const response = await post(["x", "y", "z", "w", "v"]);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ score: 0, summary: "0/5" });
  // One result per browser per day.
  expect((await post(["x", "y", "z", "w", "v"])).status()).toBe(409);
});
