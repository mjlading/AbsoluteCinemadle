import { expect, test, type Page } from "@playwright/test";

const hasTmdb = Boolean(process.env.TMDB_READ_ACCESS_TOKEN);

// Board 1's faces get these made-up names. Everything TMDB would answer is stubbed, so the games below are
// the same with or without a token; the real server is covered by the last two groups.
const NAMES = [
  "Ada Archer",
  "Ben Bright",
  "Cleo Crane",
  "Dov Dale",
  "Eva Ellis",
  "Finn Frost",
  "Gia Grant",
  "Hal Hayes",
];

const FILMS = [
  { tmdbId: 1, title: "Alpha Heist", year: 2001, faces: [0, 1, 2] },
  { tmdbId: 2, title: "Bravo Run", year: 2002, faces: [3, 4] },
  { tmdbId: 3, title: "Charlie Point", year: 2003, faces: [5, 6] },
  { tmdbId: 4, title: "Delta Road", year: 2004, faces: [7] },
  { tmdbId: 5, title: "Echo Street", year: 2005, faces: [0, 1] },
  { tmdbId: 11, title: "Empty One", year: 2011, faces: [] },
  { tmdbId: 12, title: "Empty Two", year: 2012, faces: [] },
  { tmdbId: 13, title: "Empty Three", year: 2013, faces: [] },
  { tmdbId: 14, title: "Empty Four", year: 2014, faces: [] },
  { tmdbId: 15, title: "Empty Five", year: 2015, faces: [] },
];

const faceOf = (i: number) => ({ faceId: String(i), name: NAMES[i] });

async function stubTmdbRoutes(page: Page) {
  await page.route(/\/api\/films\/search\?/, (route) => {
    const q = (new URL(route.request().url()).searchParams.get("q") ?? "").toLowerCase();
    const results = FILMS.filter((f) => f.title.toLowerCase().includes(q)).map(({ tmdbId, title, year }) => ({
      tmdbId,
      title,
      year,
    }));
    return route.fulfill({ json: { results } });
  });
  await page.route(/\/api\/casting-call\/1\/solution$/, (route) =>
    route.fulfill({ json: { faces: NAMES.map((_, i) => faceOf(i)) } }),
  );
  await page.route(/\/api\/casting-call\/1\/guess$/, (route) => {
    const film = FILMS.find((f) => f.tmdbId === route.request().postDataJSON().tmdbId)!;
    const { faces, ...summary } = film;
    return route.fulfill({ json: { film: summary, found: faces.map(faceOf) } });
  });
  await page.route(/\/api\/casting-call\/1\/faces\/\d+\/image$/, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#888"/></svg>',
    }),
  );
}

const guessBox = (page: Page) => page.getByRole("combobox", { name: "Guess a film" });
const timer = (page: Page) => page.getByRole("timer");
const guessesLeft = (page: Page, left: number) => page.getByLabel(`${left} of 5 guesses left`);
const crossedOut = (page: Page) => page.getByRole("img", { name: /, crossed out$/ });

async function openBoard(page: Page) {
  await stubTmdbRoutes(page);
  await page.goto("/casting-call/1");
  await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
}

async function start(page: Page) {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(guessBox(page)).toBeVisible();
}

/** Types a title, waits for it in the suggestions and takes it with Enter. */
async function guess(page: Page, title: string) {
  await guessBox(page).fill(title);
  await expect(page.getByRole("option").first()).toContainText(title);
  await guessBox(page).press("Enter");
}

const hit = (page: Page, title: string, names: string) => expect(page.getByText(`${title}: ${names}`)).toBeVisible();
const miss = (page: Page, title: string) => expect(page.getByText(`Nobody on the board is in ${title}.`)).toBeVisible();

async function win(page: Page) {
  await guess(page, "Alpha Heist");
  await hit(page, "Alpha Heist", "Ada Archer, Ben Bright, Cleo Crane");
  await guess(page, "Bravo Run");
  await hit(page, "Bravo Run", "Dov Dale, Eva Ellis");
  await guess(page, "Charlie Point");
  await hit(page, "Charlie Point", "Finn Frost, Gia Grant");
  await guess(page, "Delta Road");
}

test.describe("with TMDB stubbed", () => {
  test("the gallery leads to the list of boards", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: "Casting call" }) })
      .click();
    await expect(page).toHaveURL(/\/casting-call$/);
    await expect(page.getByRole("link", { name: /^Board \d/ })).toHaveCount(6);
  });

  test("before Start the faces are blurred, unnamed, and the names are not fetched", async ({ page }) => {
    const solutionCalls: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/solution")) solutionCalls.push(r.url());
    });
    await openBoard(page);

    const first = page.getByRole("img", { name: "Face 1", exact: true });
    await expect(first).toHaveClass(/blur-xl/);
    await expect(page.getByRole("img", { name: /^Face \d$/ })).toHaveCount(8);
    await expect(page.getByText("?", { exact: true })).toHaveCount(8);
    await expect(guessBox(page)).toHaveCount(0);
    await expect(timer(page)).toHaveCount(0);
    expect(solutionCalls).toEqual([]);

    await start(page);
    await expect(page.getByRole("img", { name: "Ada Archer", exact: true })).not.toHaveClass(/blur-xl/);
    await expect(page.getByText("Hal Hayes")).toBeVisible();
    await expect(timer(page)).toHaveAttribute("aria-label", /^(39|40) seconds left$/);
    expect(solutionCalls).toHaveLength(1);
  });

  test("a win crosses everyone out, survives a reload and is marked in the list", async ({ page }) => {
    await openBoard(page);
    await start(page);
    await win(page);

    await expect(page.getByRole("heading", { name: "That's a wrap!" })).toBeVisible();
    await expect(page.getByText("All 8 actors in 4 guesses.")).toBeVisible();
    await expect(crossedOut(page)).toHaveCount(8);
    await expect(page.getByText("8", { exact: true })).toBeVisible();
    await expect(guessBox(page)).toBeDisabled();

    await page.reload();
    await expect(page.getByRole("heading", { name: "That's a wrap!" })).toBeVisible();
    await expect(crossedOut(page)).toHaveCount(8);

    await page.getByRole("link", { name: "Another board" }).click();
    await expect(page.getByRole("link", { name: /^Board 1/ })).toContainText("Solved in 4");
    await expect(page.getByRole("link", { name: /^Board 2/ })).toContainText("Play");
  });

  test("a miss and a film with nobody new cost a guess; repeating a film does not", async ({ page }) => {
    await openBoard(page);
    await start(page);

    await guess(page, "Empty One");
    await miss(page, "Empty One");
    await expect(guessesLeft(page, 4)).toBeVisible();
    await expect(page.getByText("Nobody from the board")).toBeVisible();

    await guess(page, "Empty One");
    await expect(page.getByText("You already tried Empty One.")).toBeVisible();
    await expect(guessesLeft(page, 4)).toBeVisible();

    await guess(page, "Alpha Heist");
    await hit(page, "Alpha Heist", "Ada Archer, Ben Bright, Cleo Crane");
    await expect(crossedOut(page)).toHaveCount(3);

    await guess(page, "Echo Street");
    await expect(page.getByText("Echo Street only has actors you've already crossed out.")).toBeVisible();
    await expect(guessesLeft(page, 2)).toBeVisible();
    await expect(crossedOut(page)).toHaveCount(3);
  });

  test("a reload mid-game resumes the board", async ({ page }) => {
    await openBoard(page);
    await start(page);
    await guess(page, "Bravo Run");
    await hit(page, "Bravo Run", "Dov Dale, Eva Ellis");

    await page.reload();
    await expect(crossedOut(page)).toHaveCount(2);
    await expect(guessesLeft(page, 4)).toBeVisible();
    await expect(timer(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toHaveCount(0);
  });

  test("five guesses without clearing the board loses and shows who was missed", async ({ page }) => {
    await openBoard(page);
    await start(page);
    for (const title of ["Empty One", "Empty Two", "Empty Three", "Empty Four"]) {
      await guess(page, title);
      await miss(page, title);
    }
    await guess(page, "Alpha Heist");

    await expect(page.getByRole("heading", { name: "Out of guesses" })).toBeVisible();
    await expect(page.getByText("You found 3 of 8.")).toBeVisible();
    await expect(page.getByText("Hal Hayes")).toHaveClass(/text-marker/);
    await expect(page.getByText("Ada Archer", { exact: true })).not.toHaveClass(/text-marker/);
    await expect(guessBox(page)).toBeDisabled();
  });

  test("the bar refills on a film with someone from the board, not on a miss, and ends the game", async ({ page }) => {
    await page.clock.install();
    await openBoard(page);
    await start(page);

    await page.clock.fastForward(30_000);
    await expect(timer(page)).toHaveAttribute("aria-label", /^(9|10) seconds left$/);
    await guess(page, "Alpha Heist");
    await hit(page, "Alpha Heist", "Ada Archer, Ben Bright, Cleo Crane");
    await expect(timer(page)).toHaveAttribute("aria-label", /^(39|40) seconds left$/);

    await page.clock.fastForward(30_000);
    await guess(page, "Empty One");
    await miss(page, "Empty One");
    await expect(timer(page)).toHaveAttribute("aria-label", /^\d seconds left$|^10 seconds left$/);

    await page.clock.fastForward(11_000);
    await expect(page.getByRole("heading", { name: "Time's up" })).toBeVisible();
    await expect(page.getByText("You found 3 of 8.")).toBeVisible();
    await expect(timer(page)).toHaveCount(0);
    await expect(guessBox(page)).toBeDisabled();
  });

  test("the game can be played with the keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard play is a desktop concern.");
    await openBoard(page);

    await page.getByRole("button", { name: "Start" }).focus();
    await page.keyboard.press("Enter");
    await expect(guessBox(page)).toBeFocused();

    // "empty" lists all five; the arrow moves off the top suggestion and Escape closes the list.
    await page.keyboard.type("empty");
    await expect(page.getByRole("option")).toHaveCount(5);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: /Empty Two/ })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await miss(page, "Empty Two");
    await expect(guessBox(page)).toBeFocused();

    await page.keyboard.type("empty");
    await expect(page.getByRole("option")).toHaveCount(5);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test("the page has no horizontal scroll", async ({ page }) => {
    await openBoard(page);
    await start(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe("answer protection on the real server", () => {
  test("a board reveals only opaque face ids", async ({ request }) => {
    const response = await request.get("/api/casting-call/1");
    expect(response.ok()).toBe(true);
    const text = await response.text();
    expect(text).not.toContain("tmdb");
    expect(text).not.toContain("personId");
    // Board 1's first actor, by TMDB person id and by name.
    expect(text).not.toContain("6193");
    expect(text).not.toContain("DiCaprio");

    const board = JSON.parse(text);
    expect(board.faces.map((f: { id: string }) => f.id)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
  });

  test("unknown boards and faces are refused", async ({ request }) => {
    expect((await request.get("/api/casting-call/nope")).status()).toBe(404);
    expect((await request.get("/api/casting-call/1/faces/8/image")).status()).toBe(404);
    expect((await request.get("/api/casting-call/1/faces/-1/image")).status()).toBe(404);
  });
});

test.describe("against TMDB", () => {
  test.skip(!hasTmdb, "Needs TMDB_READ_ACCESS_TOKEN in .env.local.");

  test("board 4 can be cleared with four real films", async ({ page }) => {
    await page.goto("/casting-call/4");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Shelley Duvall")).toBeVisible({ timeout: 15_000 });

    for (const [title, found] of [
      ["Mad Max: Fury Road", 2],
      ["Gladiator", 4],
      ["The Shining", 6],
      ["Kill Bill: Vol. 1", 8],
    ] as const) {
      await guess(page, title);
      await expect(crossedOut(page)).toHaveCount(found, { timeout: 15_000 });
    }
    await expect(page.getByRole("heading", { name: "That's a wrap!" })).toBeVisible();
    await expect(page.getByText("All 8 actors in 4 guesses.")).toBeVisible();
  });

  test("a face picture comes from our own route", async ({ request }) => {
    const response = await request.get("/api/casting-call/4/faces/0/image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/webp");
  });
});
