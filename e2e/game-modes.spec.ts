import { expect, test } from "@playwright/test";

test(
  "the gallery lists the three games, and the first is reachable by keyboard",
  { tag: "@phone" },
  async ({ page }) => {
    await page.goto("/");
    const card = (name: string) => page.getByRole("link").filter({ has: page.getByRole("heading", { name }) });
    await expect(card("Close-Ups")).toHaveAttribute("href", "/close-ups");
    await expect(card("Casting call")).toHaveAttribute("href", "/casting-call");
    await expect(card("Soundbytes")).toHaveAttribute("href", "/soundbytes");

    await page.keyboard.press("Tab");
    await expect(card("Close-Ups")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/close-ups$/);
  },
);

test("old addresses redirect: the keyword collage to Close-Ups, the retired daily game home, fixed Casting call boards to today", async ({
  page,
}) => {
  await page.goto("/daily");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/keyword-collage/fixture1");
  await expect(page).toHaveURL(/\/close-ups\/fixture1$/);
  await page.goto("/keyword-collage");
  await expect(page).toHaveURL(/\/close-ups$/);
  await page.goto("/casting-call/4");
  await expect(page).toHaveURL(/\/casting-call$/);
});
