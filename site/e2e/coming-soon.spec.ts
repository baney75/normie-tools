import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

test("a Coming soon tile is not a link and cannot be clicked into a tool", async ({ page }) => {
  await page.goto("/");
  const tile = page.locator(".nt-card-off").first();
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute("aria-disabled", "true");
  await expect(tile.getByText("Coming soon")).toBeVisible();
  expect(await tile.evaluate((el) => el.closest("a"))).toBeNull();
  await expect(page.locator("a.nt-card")).toHaveCount(0);

  await tile.click();
  await expect(page).toHaveURL(/\/$|\/#\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
