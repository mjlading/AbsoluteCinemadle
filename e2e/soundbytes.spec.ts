import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

// The fixture board (e2e/fixtures/soundbytes/boards.json) is Jurassic Park with five synthesized placeholder lines;
// the E2E server imports it as today's board.

/** Opens today's board, with the first-visit help already seen unless a test asks for it. */
async function openToday(page: Page, { help = false } = {}) {
  if (!help) await page.addInitScript(() => window.localStorage.setItem("soundbytes:help-seen", "1"));
  await page.goto("/soundbytes");
  // Generous: the first visits to a freshly started server also warm its caches.
  await expect(line(page, 1)).toBeVisible({ timeout: 15_000 });
}

const line = (page: Page, n: number) => page.getByRole("button", { name: new RegExp(`^Line ${n}\\b`) });
const action = (page: Page) => page.getByRole("button", { name: /^(Skip|Give up\??)$/ });
const history = (page: Page) => page.getByRole("list", { name: "Your guesses" });
const OPEN = /Tap to play\.$/;

/** Every node's mark, in the order they open: four lines, then the theme. */
async function expectMarks(page: Page, marks: string[]) {
  const nodes = page.getByRole("button", { name: /^(Line \d|Theme)\b/ });
  await expect(nodes).toHaveCount(marks.length);
  for (const [i, mark] of marks.entries()) await expect(nodes.nth(i)).toHaveAttribute("data-mark", mark);
}

test(
  "the home card opens today's board straight away, with the help on a first visit",
  { tag: "@phone" },
  async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: "Soundbytes" }) })
      .click();
    await expect(page).toHaveURL(/\/soundbytes$/);
    const help = page.getByRole("dialog", { name: "How to play" });
    await expect(help).toBeVisible();
    await help.getByRole("button", { name: "Let's go" }).click();
    await expect(help).toBeHidden();
    await expect(page.getByRole("heading", { name: "Soundbytes", level: 1 })).toBeVisible();
  },
);

test(
  "line 1 plays from our clip route, each skip opens the next line, and giving up takes a second press",
  { tag: "@phone" },
  async ({ page }) => {
    await openToday(page);

    const today = await page.evaluate(() => new Date().toLocaleDateString("sv"));
    const sent = await (await page.request.get(`/api/soundbytes/day/${today}`)).text();
    expect(sent).not.toContain("Jurassic");
    expect(sent).not.toContain("source");
    await expect(page.getByText("Jurassic Park")).toHaveCount(0);

    // Every line offers the start, but only line 1 (in the center slot, first) takes it.
    await expect(action(page)).toBeDisabled();
    const clip = page.waitForResponse((r) => r.url().includes("/api/soundbytes/fixture1/clips/dialogue-a"));
    await line(page, 1).click();
    expect([200, 206]).toContain((await clip).status());
    await expect(page.getByRole("button", { name: "Line 1, playing. Tap to play." })).toBeVisible();
    await expect(page.getByRole("button", { name: OPEN })).toHaveCount(1);
    await expectMarks(page, ["current", "locked", "locked", "locked", "locked"]);

    // A locked line says so.
    await line(page, 3).click();
    await expect(page.getByRole("status")).toHaveText("Line 3 is still locked.");

    // The board's tapes are the try counter: a skip crosses out the line it was spent on.
    await action(page).click();
    await expect(page.getByRole("status")).toHaveText("Skipped. Line 2 is open.");
    await expectMarks(page, ["spent", "current", "locked", "locked", "locked"]);
    await expect(history(page).getByRole("listitem")).toHaveText(["Skipped"]);

    for (let i = 0; i < 3; i++) await action(page).click();
    await expect(action(page)).toHaveText("Give up");
    await action(page).click();
    await expect(action(page)).toHaveText("Give up?");
    await expect(page.getByRole("status")).toHaveText("Press again to give up.");
    await action(page).click();

    await expect(page.getByRole("heading", { name: "Jurassic Park" })).toBeVisible();
    await expect(page.getByText("It was")).toBeVisible();
    await expect(page.getByRole("img", { name: "Not named" })).toBeVisible();
    await expect(page.getByRole("button", { name: OPEN })).toHaveCount(5);
    await expectMarks(page, ["spent", "spent", "spent", "spent", "spent"]);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Jurassic Park" })).toBeVisible();
    await page.getByRole("link", { name: "Previous days" }).first().click();
    await expect(page).toHaveURL(/\/soundbytes\/archive$/);
    await expect(page.getByRole("listitem").getByRole("link", { name: /Today/ })).toContainText("Missed");
  },
);

test("the theme plays a window of an Apple preview and stops at its end, then links to Apple Music", async ({
  page,
}) => {
  // Apple's servers stand in for a local tone, so the test never leaves this machine.
  const theme = readFileSync(join(__dirname, "fixtures", "soundbytes", "clips", "sfx-b.wav"));
  const asked: string[] = [];
  await page.route("https://audio-ssl.itunes.apple.com/**", async (route) => {
    asked.push(route.request().url());
    // Answered in byte ranges, as Apple does: without them the audio can't seek to the window's start.
    const range = /bytes=(\d+)-(\d*)/.exec((await route.request().headerValue("range")) ?? "");
    if (!range) return route.fulfill({ body: theme, contentType: "audio/wav", headers: { "accept-ranges": "bytes" } });
    const from = Number(range[1]);
    const to = range[2] ? Number(range[2]) : theme.length - 1;
    return route.fulfill({
      status: 206,
      body: theme.subarray(from, to + 1),
      contentType: "audio/wav",
      headers: { "accept-ranges": "bytes", "content-range": `bytes ${from}-${to}/${theme.length}` },
    });
  });
  await openToday(page);
  await line(page, 1).click();
  for (let i = 0; i < 4; i++) await action(page).click();

  const record = page.getByRole("button", { name: /^Theme\b/ });
  await expect(record).toHaveAttribute("data-category", "score");
  await record.click();
  await expect(page.getByRole("button", { name: "Theme, playing. Tap to play." })).toBeVisible();
  expect(asked[0]).toMatch(/^https:\/\/audio-ssl\.itunes\.apple\.com\/.+\.m4a(#t=2,5)?$/);
  // A 3-second window: it stops by itself.
  await expect(page.getByRole("button", { name: "Theme. Tap to play." })).toBeVisible({ timeout: 6_000 });

  await action(page).click();
  await action(page).click();
  await expect(page.getByRole("link", { name: "Theme on Apple Music" })).toHaveAttribute(
    "href",
    /^https:\/\/music\.apple\.com\//,
  );
});

test("a day with no board, or one still ahead, says so", async ({ page }) => {
  await page.goto("/soundbytes/2000-01-01");
  await expect(page.getByText("There's no Soundbytes for that day.")).toBeVisible();
  await page.goto("/soundbytes/2999-01-01");
  await expect(page.getByText("That day hasn't come yet.")).toBeVisible();
  expect((await page.request.get("/api/soundbytes/day/2999-01-01")).status()).toBe(404);
});

test("the clip route answers byte ranges and only serves a board's own clips", async ({ request }) => {
  const whole = await request.get("/api/soundbytes/fixture1/clips/score-a");
  expect(whole.status()).toBe(200);
  expect(whole.headers()["content-type"]).toBe("audio/wav");
  expect(whole.headers()["cache-control"]).toContain("private");
  const size = (await whole.body()).byteLength;

  // Safari's probe before it plays anything.
  const probe = await request.get("/api/soundbytes/fixture1/clips/score-a", { headers: { Range: "bytes=0-1" } });
  expect(probe.status()).toBe(206);
  expect(probe.headers()["content-range"]).toBe(`bytes 0-1/${size}`);
  expect(probe.headers()["cache-control"]).toBe("no-store");
  expect((await probe.body()).byteLength).toBe(2);

  expect((await request.get("/api/soundbytes/no-such-board/clips/score-a")).status()).toBe(404);
  expect((await request.get("/api/soundbytes/fixture1/clips/nope")).status()).toBe(404);
});

test("the board fits one screen, with no scrolling either way", { tag: "@phone" }, async ({ page }) => {
  await openToday(page);
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow).toEqual({ x: 0, y: 0 });
  await expect(page.getByRole("contentinfo")).toBeInViewport();
});
