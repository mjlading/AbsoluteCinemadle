import { expect, test, type Locator, type Page } from "@playwright/test";

// The fixture puzzle (e2e/fixtures/keyword-collage.json) stores 5 keywords; the game uses 4 and drops one from
// the middle, so it reveals Hands (the free starter), Doors, Food and Signs (Mouths is never served);
// the film is Back to the Future.
const ANSWER = "Back to the Future";
const KEYWORDS = ["Hands", "Doors", "Food", "Signs"];
// What the game keys its saved progress to: every tile id, in reveal order (four per keyword).
const SIGNATURE = [...Array.from({ length: 12 }, (_, i) => i + 1), 17, 18, 19, 20]
  .map((n) => `fixturetile${String(n).padStart(2, "0")}`)
  .join(",");

const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
const guessBox = (page: Page) => page.getByRole("combobox", { name: /^Name the film/ });
const history = (page: Page) => page.getByRole("list", { name: "Your guesses" });
/** The one button beside the guess box: Skip while it is empty, Guess once there is text. */
const guessButton = (page: Page) => page.locator("form").getByRole("button");
const live = (page: Page) => page.getByRole("status");
const enhance = (page: Page) => page.getByRole("button", { name: "Enhance", exact: true });
const score = (page: Page) => page.getByTestId("score");
const closeUps = (page: Page, keyword: string) =>
  page.getByRole("img", { name: new RegExp(`^${keyword}, close-up \\d of 4$`) });

/** Opens today's puzzle (the fixture's first), with the first-visit help already seen unless a test asks for it. */
async function openPuzzle(page: Page, { help = false } = {}) {
  if (!help) await page.addInitScript(() => window.localStorage.setItem("close-ups:help-seen", "1"));
  await page.goto("/close-ups");
  // Generous: the first visits to a freshly started server also warm its caches.
  await expect(tab(page, "Hands")).toBeVisible({ timeout: 15_000 });
}

async function guess(page: Page, title: string) {
  await guessBox(page).fill(title);
  await guessBox(page).press("Enter");
}

async function expectRound(page: Page, current: string) {
  const index = KEYWORDS.indexOf(current);
  for (const [i, keyword] of KEYWORDS.entries()) {
    await expect(tab(page, keyword)).toHaveAttribute(
      "data-state",
      i < index ? "spent" : i === index ? "current" : "locked",
    );
  }
}

/** Presses Tab (or Shift+Tab) until the locator has focus. */
async function tabTo(page: Page, target: Locator, key = "Tab") {
  for (let i = 0; i < 20; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}

test.beforeEach(async ({ page }) => {
  // Suggestions come from TMDB; tests that need them answer for it.
  await page.route("**/api/films/search**", (route) => route.fulfill({ json: { results: [] } }));
});

test("the help opens on the first visit only", async ({ page }) => {
  await openPuzzle(page, { help: true });
  const dialog = page.getByRole("dialog", { name: "How to play" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Let's go" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(tab(page, "Hands")).toBeVisible();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(dialog).toBeVisible();
});

test(
  "a game: a miss, Enter on an empty box, a skip, enhance, then the right guess",
  { tag: "@phone" },
  async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openPuzzle(page);

    // The answer is nowhere on the page or in what the client got.
    const puzzle = await (await page.request.get("/api/collage/fixture1")).text();
    expect(puzzle).not.toContain(ANSWER);
    await expect(page.getByText(ANSWER)).toHaveCount(0);
    await expectRound(page, "Hands");
    await expect(closeUps(page, "Hands")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    // No empty list before the first miss.
    await expect(history(page)).toHaveCount(0);

    await guess(page, "Jaws");
    await expectRound(page, "Doors");
    await expect(closeUps(page, "Doors")).toHaveCount(4);
    await expect(history(page).getByRole("listitem")).toHaveText(["Jaws"]);
    await expect(live(page)).toHaveText("Not Jaws. Doors is open.");
    await expect(guessBox(page)).toBeFocused();
    await expect(guessBox(page)).toHaveValue("");

    // Enter in an empty box changes nothing: the skip below opens Food, not Signs.
    await guessBox(page).press("Enter");
    await page.getByRole("button", { name: "Skip" }).click();
    await expectRound(page, "Food");
    await expect(history(page).getByRole("listitem")).toHaveText(["Jaws", "Skipped"]);
    await expect(page.getByRole("button", { name: "Skip" })).toBeFocused();

    // No how-to text on screen: what Enhance does is told to screen readers only.
    await expect(enhance(page)).toHaveAttribute("title", "Enhance");
    await expect(enhance(page)).toHaveAccessibleDescription("Widens one close-up, once per game.");
    await enhance(page).click();
    await expect(enhance(page)).toHaveAttribute("aria-pressed", "true");
    await expect(live(page)).toHaveText("Pick a close-up to widen.");
    await page.getByRole("button", { name: "Food, close-up 2 of 4" }).click();
    await expect(page.getByRole("img", { name: "Food, close-up 2 of 4, enhanced" })).toBeVisible();
    await expect(enhance(page)).toHaveCount(0);

    await guess(page, "back to the futur");
    await expect(page.getByRole("heading", { name: ANSWER })).toBeVisible();
    await expect(page.getByText("Got it", { exact: true })).toBeVisible();
    await expect(score(page)).toHaveText("2");
    await expect(tab(page, "Food")).toHaveAttribute("data-state", "won");

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    // Windows' clipboard turns line breaks into CRLF.
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n");
    expect(copied).toMatch(/^Close-Ups (#\d+ )?2\/6\n🟥🟥🟩⬛$/);

    // Every keyword is viewable now, and its close-ups pull back to the full frames.
    for (const keyword of KEYWORDS) {
      await tab(page, keyword).click();
      await expect(tab(page, keyword)).toHaveAttribute("aria-selected", "true");
      await expect(
        page.getByRole("img", { name: new RegExp(`^${keyword}, close-up \\d of 4, full frame$`) }),
      ).toHaveCount(4);
    }
  },
);

test("the first clue wins 6 with the bonus", async ({ page }) => {
  await openPuzzle(page);
  await guess(page, ANSWER);
  await expect(page.getByRole("heading", { name: ANSWER })).toBeVisible();
  await expect(page.getByText("First clue!")).toBeVisible();
  await expect(score(page)).toHaveText("6");
  await expect(page.getByText("+2 first clue")).toBeVisible();
  await expect(page.getByRole("heading", { name: ANSWER })).toBeFocused();

  // The game stays finished, and the archive shows today's score.
  await page.reload();
  await expect(score(page)).toHaveText("6");
  await page.getByRole("link", { name: "Previous days" }).last().click();
  await expect(page.getByRole("listitem").first()).toContainText("6/6");
});

test("four misses lose, and giving up takes two presses", async ({ page }) => {
  await openPuzzle(page);
  await guess(page, "Jaws");
  await page.getByRole("button", { name: "Skip" }).click();
  await guess(page, "Alien");
  await expectRound(page, "Signs");

  await page.getByRole("button", { name: "Give up", exact: true }).click();
  await expect(page.getByRole("button", { name: "Give up?" })).toBeVisible();
  await expect(live(page)).toHaveText("Press again to give up.");
  await expect(tab(page, "Signs")).toHaveAttribute("data-state", "current");
  await expect(page.getByRole("heading", { name: ANSWER })).toHaveCount(0);

  await page.getByRole("button", { name: "Give up?" }).click();
  await expect(page.getByText("It was", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: ANSWER })).toBeVisible();
  await expect(score(page)).toHaveText("0");
});

test("a repeated guess costs nothing, a reload mid-game resumes, and an old saved game is ignored", async ({
  page,
}) => {
  // The old key, holding a finished game in the old shape, for the very same tiles: only the new key keeps it out.
  await page.addInitScript(
    (signature) =>
      window.localStorage.setItem(
        "collage:fixture1",
        JSON.stringify({
          v: 1,
          signature,
          state: {
            unlocked: ["kwhands", "kwfood"],
            guesses: [{ text: "Up", correct: false }],
            enhanced: null,
            status: "lost",
            answer: null,
          },
        }),
      ),
    SIGNATURE,
  );
  await openPuzzle(page);
  await expectRound(page, "Hands");

  await guess(page, "Jaws");
  await expectRound(page, "Doors");
  await guess(page, "jaws");
  await expect(live(page)).toHaveText("Already guessed Jaws.");
  await expectRound(page, "Doors");
  await expect(guessBox(page)).toHaveValue("jaws");

  await page.reload();
  await expectRound(page, "Doors");
  await expect(history(page).getByRole("listitem")).toHaveText(["Jaws"]);
});

test("a guess that can't be checked costs nothing", async ({ page }) => {
  await openPuzzle(page);
  await page.route("**/api/collage/*/guess", (route) => route.abort());
  await guess(page, "Jaws");
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't check that guess" })).toBeVisible();
  await expectRound(page, "Hands");
  await expect(guessBox(page)).toHaveValue("Jaws");
});

test("a double submit spends one guess", async ({ page }) => {
  await openPuzzle(page);
  let requests = 0;
  await page.route("**/api/collage/*/guess", async (route) => {
    requests++;
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await guessBox(page).fill("Jaws");
  await guessBox(page).press("Enter");
  await guessBox(page).press("Enter");
  await expectRound(page, "Doors");
  await expect(history(page).getByRole("listitem")).toHaveCount(1);
  expect(requests).toBe(1);
});

/** Holds every guess for a moment, so a test can press again while it is being checked. */
async function slowGuesses(page: Page) {
  await page.route("**/api/collage/*/guess", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
}

/** One guess was spent on Jaws and nothing else: no skip slipped in. */
async function expectOnlyJawsSpent(page: Page) {
  await expectRound(page, "Doors");
  await expect(history(page).getByRole("listitem")).toHaveText(["Jaws"]);
  await expect(tab(page, "Food")).toHaveAttribute("data-state", "locked");
}

test("a double tap on Guess held across the answer is not a Skip", { tag: "@phone" }, async ({ page }) => {
  await openPuzzle(page);
  await slowGuesses(page);
  await guessBox(page).fill("Jaws");
  await guessButton(page).click();
  await expect(guessButton(page)).toHaveAttribute("aria-busy", "true");
  await expect(guessButton(page)).toHaveAttribute("aria-disabled", "true");
  await expect(guessBox(page)).toBeEnabled();

  // A tap while the guess is checked does nothing.
  await guessButton(page).click({ force: true });

  // A tap that lands while checking and lifts once the button reads Skip (well past the double-tap window).
  const box = (await guessButton(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(guessButton(page)).toHaveText("Skip");
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expectOnlyJawsSpent(page);
});

test("a second tap on Guess right as the answer comes in is not a Skip", { tag: "@phone" }, async ({ page }) => {
  await openPuzzle(page);
  await slowGuesses(page);
  await guessBox(page).fill("Jaws");
  await guessButton(page).click();
  await expect(guessButton(page)).toHaveAttribute("aria-busy", "true");
  // Press the very moment the button turns into Skip, as the second half of a double tap would.
  await guessButton(page).evaluate(
    (button) =>
      new Promise<void>((resolve) => {
        new MutationObserver((_, observer) => {
          if (button.textContent !== "Skip") return;
          observer.disconnect();
          (button as HTMLButtonElement).click();
          resolve();
        }).observe(button, { subtree: true, childList: true, characterData: true });
      }),
  );
  await expectOnlyJawsSpent(page);

  // Once the moment has passed, Skip works.
  await page.waitForTimeout(600);
  await guessButton(page).click();
  await expectRound(page, "Food");
});

test("fits one screen", { tag: "@phone" }, async ({ page }) => {
  await openPuzzle(page);
  const overflow = () =>
    page.evaluate(() => {
      const root = document.scrollingElement!;
      return { y: root.scrollHeight - window.innerHeight, x: root.scrollWidth - root.clientWidth };
    });
  const sizes = [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect.poll(async () => (await overflow()).x).toBe(0);
    expect((await overflow()).y).toBeLessThanOrEqual(0);
  }

  // A landscape phone may scroll, but the board stays usable and the guess box can be reached.
  await page.setViewportSize({ width: 844, height: 390 });
  const board = await page.getByRole("tablist", { name: "Keywords" }).boundingBox();
  expect(board!.width).toBeGreaterThanOrEqual(200);
  await guessBox(page).scrollIntoViewIfNeeded();
  await expect(guessBox(page)).toBeInViewport();
  await guess(page, "Jaws");
  await expectRound(page, "Doors");

  // The finished game fits too.
  await guess(page, ANSWER);
  await expect(page.getByRole("heading", { name: ANSWER })).toBeVisible();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect.poll(async () => (await overflow()).x).toBe(0);
    expect((await overflow()).y).toBeLessThanOrEqual(0);
  }
});

test("playable by keyboard alone", async ({ page }) => {
  await page.route("**/api/films/search**", (route) =>
    route.fulfill({
      json: {
        results: [
          { tmdbId: 578, title: "Jaws", year: 1975 },
          { tmdbId: 579, title: "Jaws 2", year: 1978 },
        ],
      },
    }),
  );
  await openPuzzle(page);

  await tabTo(page, guessBox(page));
  await page.keyboard.type("jaw");
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: /Jaws 2/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expectRound(page, "Doors");
  await expect(history(page).getByRole("listitem")).toHaveText(["Jaws 2"]);
  await expect(guessBox(page)).toBeFocused();

  // The strip is one tab stop; the arrows move between the opened keywords and skip the locked ones.
  await tabTo(page, tab(page, "Doors"), "Shift+Tab");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Hands")).toBeFocused();
  await expect(tab(page, "Hands")).toHaveAttribute("aria-selected", "true");
  await expect(closeUps(page, "Hands")).toHaveCount(4);
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Doors")).toBeFocused();
  await expect(closeUps(page, "Doors")).toHaveCount(4);

  // Escape leaves picking mode from a tile and puts focus back on the badge.
  await tabTo(page, enhance(page));
  await page.keyboard.press("Enter");
  await expect(enhance(page)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Doors, close-up 1 of 4" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(enhance(page)).toHaveAttribute("aria-pressed", "false");
  await expect(enhance(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(enhance(page)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Doors, close-up 1 of 4" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("img", { name: "Doors, close-up 1 of 4, enhanced" })).toBeVisible();
  await expect(enhance(page)).toHaveCount(0);
});

test("the archive lists earlier days, and no day ahead of the player's opens", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("close-ups:help-seen", "1"));
  await page.goto("/close-ups/archive");
  const days = page.getByRole("listitem");
  await expect(days).toHaveCount(2);
  await expect(days.first()).toContainText("Today");

  // Yesterday's puzzle plays at its own address.
  await days.nth(1).getByRole("link").click();
  await expect(page).toHaveURL(/\/close-ups\/\d{4}-\d{2}-\d{2}$/);
  await expect(tab(page, "Hands")).toBeVisible();

  // A day that hasn't come yet stays closed, in the page and in the API.
  await page.goto("/close-ups/2999-01-01");
  await expect(page.getByText("That day hasn't come yet.")).toBeVisible();
  expect((await page.request.get("/api/collage/day/2999-01-01")).status()).toBe(404);
  const { days: listed } = await (await page.request.get("/api/collage")).json();
  expect(listed).toHaveLength(2);
});
