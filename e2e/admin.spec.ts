import { expect, test, type Page } from "@playwright/test";

import { createDraft, sql } from "./support/db";
import { E2E_ADMIN_PASSWORD } from "./support/env";
import { endWarmupAndOpenGrid } from "./support/game";

const hasTmdb = Boolean(process.env.TMDB_READ_ACCESS_TOKEN);

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Puzzles" })).toBeVisible();
}

const isoDateInDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test.describe("puzzle editor", () => {
  test.skip(({ isMobile }) => isMobile, "The editor is a desktop tool.");

  test("is behind a password", async ({ page, request, context }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "That password is not right." })).toBeVisible();

    expect((await request.get("/api/admin/tmdb/search?q=jaws")).status()).toBe(401);

    // A cookie that merely looks right gets past the optimistic redirect but not the real check.
    await context.addCookies([
      { name: "cinemadle_admin", value: `${Date.now() + 86_400_000}.forged`, url: page.url() },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("flags upcoming days without a puzzle", async ({ page }) => {
    await signIn(page);
    // The seed covers yesterday, today and tomorrow, so the rest of the fortnight is empty.
    await expect(page.getByRole("status")).toContainText("days have no puzzle");
    await expect(page.getByText("No puzzle").first()).toBeVisible();
  });

  test("finds films through TMDB search", async ({ page }) => {
    test.skip(!hasTmdb, "Needs TMDB_READ_ACCESS_TOKEN in .env.local.");
    await signIn(page);
    await page.getByRole("button", { name: "New puzzle" }).click();
    await expect(page.getByRole("heading", { name: "Draft puzzle" })).toBeVisible();

    await page.getByLabel("Find a film").first().fill("Jaws");
    await page
      .getByRole("list", { name: "Search results" })
      .getByRole("button", { name: /^Jaws\s*1975$/ })
      .click();
    await expect(page.getByRole("region", { name: "Tiles for Jaws" })).toBeVisible();
    await expect(page.getByText("Pick 4 films (1 so far).")).toBeVisible();
  });

  test("finishes a draft, schedules it and plays the preview", async ({ page }) => {
    test.skip(!hasTmdb, "Needs TMDB_READ_ACCESS_TOKEN in .env.local.");
    const id = await createDraft(
      [
        { tmdbId: 578, title: "Jaws", tier: 1 },
        { tmdbId: 105, title: "Back to the Future", tier: 2 },
        { tmdbId: 85, title: "Raiders of the Lost Ark", tier: 3 },
        { tmdbId: 78, title: "Blade Runner", tier: 4 },
      ],
      [4, 4, 4, 3],
      [
        { tmdbId: 562, title: "Die Hard", tier: 0 },
        { tmdbId: 771, title: "Home Alone", tier: 0 },
        { tmdbId: 621, title: "Grease", tier: 0 },
        { tmdbId: 703, title: "Annie Hall", tier: 0 },
        { tmdbId: 38, title: "Eternal Sunshine of the Spotless Mind", tier: 0 },
      ],
    );
    await page.clock.install();
    await signIn(page);
    await page.goto(`/admin/puzzles/${id}`);
    await expect(page.getByText("Blade Runner has 3 of 4 tiles.")).toBeVisible();

    // The last tile: a headshot picked from the cast and framed in the crop tool.
    const tiles = page.getByRole("region", { name: "Tiles for Blade Runner" });
    await tiles.getByRole("tabpanel").getByRole("button").first().click();
    await tiles
      .getByRole("button", { name: /^Use photo/ })
      .first()
      .click();
    const crop = page.getByRole("dialog", { name: "Frame the tile" });
    await crop.getByRole("button", { name: "Add tile" }).click();
    await expect(crop).toBeHidden();
    await expect(page.getByText("Blade Runner has 3 of 4 tiles.")).toHaveCount(0);

    // A random far-off day, so repeated runs against the same database never collide.
    const date = isoDateInDays(100 + Math.floor(Math.random() * 5000));
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.getByRole("button", { name: "Schedule" }).click();
    await expect(page.getByRole("heading", { name: /^Puzzle for / })).toBeVisible();

    await page.getByRole("link", { name: "Preview as a player" }).click();
    await expect(page.getByText(/Nothing you do here is saved/)).toBeVisible();
    await endWarmupAndOpenGrid(page);
    const response = await page.request.get(`/api/admin/puzzles/${id}/solution`);
    const [jaws] = ((await response.json()) as { groups: { tileIds: string[] }[] }).groups;
    for (const tileId of jaws.tileIds) await page.locator(`[data-tile-id="${tileId}"] .tile-face`).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("heading", { name: "Solved: Jaws" })).toBeVisible();
  });

  test("builds a warm-up card from a foreign title", async ({ page }) => {
    test.skip(!hasTmdb, "Needs TMDB_READ_ACCESS_TOKEN in .env.local.");
    const id = await createDraft([{ tmdbId: 578, title: "Jaws", tier: 1 }], [0]);
    await signIn(page);
    await page.goto(`/admin/puzzles/${id}`);
    const warmup = page.getByRole("region", { name: "Warm-up" });

    // A grid film is refused.
    await warmup.getByLabel("Film for warm-up card 1").fill("Jaws");
    await warmup
      .getByRole("list", { name: "Search results" })
      .getByRole("button", { name: /^Jaws\s*1975$/ })
      .click();
    await fillCard(warmup, "Der weiße Hai", "de", "DE", "The White Shark");
    await expect(warmup.getByRole("alert").filter({ hasText: "That film is in the grid" })).toBeVisible();

    await warmup.getByRole("button", { name: "Choose another film" }).click();
    await warmup.getByLabel("Film for warm-up card 1").fill("Spirited Away");
    await warmup.getByRole("list", { name: "Search results" }).getByRole("button").first().click();
    await expect(warmup.getByText("Foreign titles on TMDB")).toBeVisible();
    await fillCard(warmup, "Chihiros Reise ins Zauberland", "de", "DE", "Chihiro's Journey into the Magic Land");
    await expect(warmup.getByText("Card 1: Spirited Away (2001)")).toBeVisible();
    await expect(warmup.getByLabel("Film for warm-up card 2")).toBeVisible();
    await expect(page.getByText("Add 5 warm-up titles (1 so far).")).toBeVisible();
  });
});

test.describe("hints", () => {
  test.skip(({ isMobile }) => isMobile, "The editor is a desktop tool.");

  test("a sound hint and a review hint are saved by hand, and removed", async ({ page }) => {
    const id = await createDraft([{ tmdbId: 578, title: "Jaws", tier: 1 }], [0]);
    await signIn(page);
    await page.goto(`/admin/puzzles/${id}`);
    const jaws = page.getByRole("region", { name: "Hints" }).getByRole("listitem").filter({ hasText: "Jaws" });
    const sound = jaws.getByRole("group", { name: "Sound hint" });
    const review = jaws.getByRole("group", { name: "Review hint" });

    await sound.getByLabel("YouTube link").fill("https://www.youtube.com/watch?v=N9hzLQUGr34&t=5s");
    await sound.getByLabel("Start (minutes:seconds)").fill("0:14");
    await sound.getByLabel("End (minutes:seconds)").fill("0:12");
    await expect(sound.getByText("Use whole seconds, with the end after the start, like 1:23 to 1:25.")).toBeVisible();
    await expect(sound.getByRole("button", { name: "Save sound hint" })).toBeDisabled();
    await sound.getByLabel("Start (minutes:seconds)").fill("0:12");
    await sound.getByLabel("End (minutes:seconds)").fill("0:14");
    await sound.getByRole("button", { name: "Save sound hint" }).click();
    await expect(sound.getByRole("button", { name: "Save changes" })).toBeVisible();

    await review.getByLabel("Excerpt").fill("You will never look at a calm beach the same way again.");
    await review.getByLabel("Reviewer").fill("A. Reviewer");
    await review.getByRole("button", { name: "Save review hint" }).click();
    await expect(review.getByRole("button", { name: "Save changes" })).toBeVisible();

    expect(await sql`select youtube_id, start_seconds, end_seconds from sound_hints where puzzle_id = ${id}`).toEqual([
      { youtube_id: "N9hzLQUGr34", start_seconds: 12, end_seconds: 14 },
    ]);
    expect(await sql`select excerpt, author from review_hints where puzzle_id = ${id}`).toEqual([
      { excerpt: "You will never look at a calm beach the same way again.", author: "A. Reviewer" },
    ]);

    await sound.getByRole("button", { name: "Remove" }).click();
    await expect(sound.getByRole("button", { name: "Save sound hint" })).toBeVisible();
    await expect(sound.getByLabel("YouTube link")).toHaveValue("");
    expect(await sql`select 1 from sound_hints where puzzle_id = ${id}`).toHaveLength(0);
  });
});

test.describe("barcodes", () => {
  test.skip(({ isMobile }) => isMobile, "The editor is a desktop tool.");

  test("an uploaded image replaces a missing barcode", async ({ page }) => {
    // A film the seed never touched, so it has no generated barcode yet.
    const id = await createDraft([{ tmdbId: 694, title: "The Shining", tier: 1 }], [0]);
    await signIn(page);
    await page.goto(`/admin/puzzles/${id}`);
    await expect(page.getByText("The Shining needs a barcode: regenerate it or upload one.")).toBeVisible();

    const barcodes = page.getByRole("region", { name: "Barcodes" });
    await barcodes.getByLabel("Barcode image for The Shining").setInputFiles("e2e/fixtures/barcode.png");
    await expect(barcodes.getByText("(uploaded)")).toBeVisible();
    await expect(page.getByText("The Shining needs a barcode: regenerate it or upload one.")).toHaveCount(0);

    await barcodes.getByRole("button", { name: "Use the generated strip" }).click();
    await expect(page.getByText("The Shining needs a barcode: regenerate it or upload one.")).toBeVisible();
  });
});

async function fillCard(
  warmup: ReturnType<Page["getByRole"]>,
  foreignTitle: string,
  language: string,
  country: string,
  literal: string,
) {
  await warmup.getByLabel("Foreign title", { exact: true }).fill(foreignTitle);
  await warmup.getByLabel("Language code").fill(language);
  await warmup.getByLabel(/^Country code/).fill(country);
  await warmup.getByLabel(/^Literal translation/).fill(literal);
  await warmup.getByRole("button", { name: "Add to the warm-up" }).click();
}
