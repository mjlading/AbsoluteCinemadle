import { expect, test, type Page } from "@playwright/test";

import { fetchSolution, guess, skipToGrid } from "./support/game";

const hintButton = (page: Page, name: "Sound hint" | "Review hint") =>
  page.getByRole("button", { name: new RegExp(`^${name} `) });

/**
 * Stands in for YouTube's IFrame Player API, so tests never reach YouTube. Like
 * the real one it replaces the mount element; the player is ready at once and
 * plays a short window when asked.
 */
const FAKE_YOUTUBE_API = `
window.YT = {
  Player: class {
    constructor(element, options) {
      this.options = options;
      const frame = document.createElement("div");
      frame.dataset.testid = "fake-youtube-player";
      frame.dataset.video = options.videoId;
      frame.dataset.window = options.playerVars.start + "-" + options.playerVars.end;
      element.replaceWith(frame);
      setTimeout(() => options.events.onReady(), 50);
    }
    seekTo() {}
    playVideo() {
      const change = (data) => this.options.events.onStateChange({ data });
      setTimeout(() => change(3), 50);
      setTimeout(() => change(1), 100);
      setTimeout(() => change(0), 400);
    }
    destroy() {}
  },
};
window.onYouTubeIframeAPIReady?.();
`;

/** Keeps YouTube out of tests: either a stand-in player API, or YouTube unreachable. */
async function routeYouTube(page: Page, mode: "fake" | "unreachable") {
  await page.route(/^https:\/\/www\.youtube(-nocookie)?\.com\//, (route) => route.abort());
  if (mode === "fake") {
    await page.route("https://www.youtube.com/iframe_api", (route) =>
      route.fulfill({ contentType: "text/javascript", body: FAKE_YOUTUBE_API }),
    );
  }
}

test("a review hint quotes a review of a film still to find, and stays to reread", async ({ page }) => {
  await skipToGrid(page);
  // The seed gives Jaws and Blade Runner review hints; solving Blade Runner leaves only Jaws's.
  const bladeRunner = (await fetchSolution(page)).find((g) => g.filmId === 78)!;
  await guess(page, bladeRunner.tileIds);
  await expect(hintButton(page, "Review hint")).toHaveAccessibleName("Review hint −10 points · 2 left");

  await hintButton(page, "Review hint").click();
  const dialog = page.getByRole("dialog", { name: "Review hint" });
  await dialog.getByRole("button", { name: "Use a hint (costs 10 points)" }).click();
  await expect(dialog.locator("blockquote")).toHaveText(/calm beach/);
  await expect(dialog).toContainText("From a review by sample on TMDB");

  await dialog.getByRole("button", { name: "Use another hint (costs 10 points)" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("There's no new review hint for the films you have left.");
  await expect(dialog.locator("blockquote")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(hintButton(page, "Review hint")).toHaveAccessibleName("Review hint −10 points · 1 left");

  // A hint already paid for can be read again, even after a reload.
  await page.reload();
  await hintButton(page, "Review hint").click();
  await expect(page.getByRole("dialog", { name: "Review hint" }).locator("blockquote")).toHaveText(/calm beach/);
});

test("a sound hint plays its clip on request and counts once the player is ready", async ({ page }) => {
  await routeYouTube(page, "fake");
  await skipToGrid(page);
  // Only Jaws has a sound hint in the seed, so there is one to take, not the daily two.
  await expect(hintButton(page, "Sound hint")).toHaveAccessibleName("Sound hint −15 points · 1 left");

  await hintButton(page, "Sound hint").click();
  const dialog = page.getByRole("dialog", { name: "Sound hint" });
  await expect(dialog).toContainText("YouTube shows the video and its title");
  await dialog.getByRole("button", { name: "Use a hint (costs 15 points)" }).click();
  const player = dialog.getByTestId("fake-youtube-player");
  await expect(player).toHaveAttribute("data-video", "N9hzLQUGr34");
  await expect(player).toHaveAttribute("data-window", "12-14");

  await dialog.getByRole("button", { name: "Play the clip" }).click();
  await expect(dialog.getByRole("button", { name: "Play it again" })).toBeVisible();
  await expect(dialog).toContainText("That's all the sound hints for today.");
  await page.keyboard.press("Escape");
  await expect(hintButton(page, "Sound hint")).toHaveAccessibleName("Sound hint −15 points · 0 left");
});

test("a sound hint whose clip can't load isn't counted", async ({ page }) => {
  await routeYouTube(page, "unreachable");
  await skipToGrid(page);
  await hintButton(page, "Sound hint").click();
  const dialog = page.getByRole("dialog", { name: "Sound hint" });
  await dialog.getByRole("button", { name: "Use a hint (costs 15 points)" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "The clip couldn't be loaded, so this hint hasn't been counted. Try again later.",
  );
  await page.keyboard.press("Escape");
  await expect(hintButton(page, "Sound hint")).toHaveAccessibleName("Sound hint −15 points · 1 left");
});
