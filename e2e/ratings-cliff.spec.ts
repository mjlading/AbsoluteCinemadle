import { expect, test, type Page } from "@playwright/test";

// Today's fixture board (e2e/fixtures/ratings-cliff.json, imported for today as "fixture1"): five made-up
// series with made-up ratings, so nothing here reaches TMDB. The right title in each round, in order:
const ANSWERS = ["The Long Count", "The Understudies", "Second Wind", "The Tollkeepers", "Ferris Point"];
const WRONG = ["Harbour Lights", "Copper Valley", "Paper Kingdom", "Quiet Hours Club", "The Archivists"];

const option = (page: Page, title: string) =>
  page.getByRole("group", { name: "Which series is this?" }).getByRole("button", { name: title, exact: true });
const next = (page: Page) => page.getByRole("button", { name: /^(Next series|See your score)$/ });

async function open(page: Page, { help = false } = {}) {
  if (!help) await page.addInitScript(() => window.localStorage.setItem("ratings-cliff:help-seen", "true"));
  await page.goto("/ratings-cliff");
  // Generous: the first visits to a freshly started server also warm its caches.
  await expect(page.getByRole("heading", { name: /Series 1 of 5/ })).toBeVisible({ timeout: 15_000 });
}

test(
  "a whole day: the help on a first visit, a pick per series, the reveal, the score and Share",
  { tag: "@phone" },
  async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/ratings-cliff");
    const help = page.getByRole("dialog", { name: "How to play" });
    await expect(help).toBeVisible({ timeout: 15_000 });
    await help.getByRole("button", { name: "Let's go" }).click();
    await expect(help).toBeHidden();

    // The chart has a text alternative that never names the series.
    const chart = page.getByRole("table");
    await expect(chart).toHaveAccessibleName(/^Episode ratings chart: \d+ seasons?, \d+ episodes?; ratings from/);
    await expect(page.getByText(/^\d+ seasons?, \d+ rated episodes?$/)).toBeVisible();
    await expect(page.getByRole("group", { name: "Which series is this?" }).getByRole("button")).toHaveCount(4);

    for (let round = 0; round < 5; round++) {
      await expect(page.getByRole("heading", { name: `Series ${round + 1} of 5` })).toBeVisible();
      // Three right, then two wrong.
      await option(page, round < 3 ? ANSWERS[round] : WRONG[round]).click();
      const reveal = page.getByRole("heading", { name: new RegExp(`^${ANSWERS[round]} \\(`) });
      await expect(reveal).toBeFocused();
      await expect(page.getByText(round < 3 ? "Got it" : "It was", { exact: true })).toBeVisible();
      // A round is picked once, and the right option is announced as the answer.
      const options = page.getByRole("group", { name: "Which series is this?" }).getByRole("button");
      for (const button of await options.all()) await expect(button).toBeDisabled();
      await expect(options.filter({ hasText: ANSWERS[round] })).toHaveAccessibleName(`${ANSWERS[round]} (the answer)`);
      await next(page).click();
    }

    await expect(page.getByRole("heading", { name: "Good eye" })).toBeFocused();
    await expect(page.getByTestId("score")).toHaveText("3");
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    // Windows' clipboard turns line breaks into CRLF.
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n");
    expect(copied).toMatch(/^Ratings Cliff #\d+ 3\/5\n🟩🟩🟩🟥🟥$/);
    expect(copied).not.toContain(ANSWERS[0]);
    const result = page.getByRole("region", { name: "Good eye" });
    await expect(result.getByRole("link", { name: "Previous days" })).toHaveAttribute("href", "/ratings-cliff/archive");

    // The page never scrolls sideways.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(0);
  },
);

test("a reload mid-game resumes where it was", async ({ page }) => {
  await open(page);
  await option(page, ANSWERS[0]).click();
  await next(page).click();
  await option(page, WRONG[1]).click();
  await expect(page.getByText("It was", { exact: true })).toBeVisible();
  await page.reload();
  // Round 2 was picked but not moved past: its reveal is still up.
  await expect(page.getByRole("heading", { name: /^The Understudies \(/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("It was", { exact: true })).toBeVisible();
  await expect(page.getByLabel("2 of 5 picked, 1 right")).toBeVisible();
});

test("playable by keyboard alone", async ({ page }) => {
  await open(page);
  // Tab from the top reaches the first option after the top bar's links.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    if (await option(page, "Harbour Lights").evaluate((el) => el === document.activeElement)) break;
  }
  await expect(option(page, "Harbour Lights")).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /^The Long Count \(/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(next(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Series 2 of 5" })).toBeFocused();
});

test("the answers stay on the server until a pick", async ({ page }) => {
  const day = page.waitForResponse((r) => r.url().includes("/api/ratings-cliff/day/"));
  await open(page);
  const body = await (await day).text();
  for (const secret of ["answer", "seriesId", "reveal", "firstYear", "votes", "Made-up ratings"]) {
    expect(body).not.toContain(secret);
  }
  const { id } = JSON.parse(body) as { id: string };
  const guess = (data: unknown) => page.request.post(`/api/ratings-cliff/${id}/guess`, { data });
  expect((await guess({ round: 5, option: "b1r0o0" })).status()).toBe(400);
  expect((await guess({ round: 0, option: "nope" })).status()).toBe(400);
  expect((await page.request.post("/api/ratings-cliff/nope/guess", { data: { round: 0, option: "x" } })).status()).toBe(
    404,
  );
  const right = await (await guess({ round: 0, option: "b1r0o0" })).json();
  expect(right).toEqual({ correctOption: "b1r0o1", series: "The Long Count (2010–2015)", reveal: expect.any(String) });
});

test("the archive lists earlier days, and no day ahead of the player's opens", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("ratings-cliff:help-seen", "true"));
  await page.goto("/ratings-cliff/archive");
  const days = page.getByRole("listitem");
  await expect(days).toHaveCount(2);
  await expect(days.first()).toContainText("Today");

  await days.nth(1).getByRole("link").click();
  await expect(page).toHaveURL(/\/ratings-cliff\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole("heading", { name: "Series 1 of 5" })).toBeVisible();

  await page.goto("/ratings-cliff/2999-01-01");
  await expect(page.getByText("That day hasn't come yet.")).toBeVisible();
  expect((await page.request.get("/api/ratings-cliff/day/2999-01-01")).status()).toBe(404);
  const { days: listed } = await (await page.request.get("/api/ratings-cliff")).json();
  expect(listed).toHaveLength(2);
});
