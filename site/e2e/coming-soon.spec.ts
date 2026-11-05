import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { publicPath } from "./paths";
import { PHONE } from "./viewports";

const tools = JSON.parse(fs.readFileSync(publicPath("tools.json"), "utf8")).tools as { id: string; name: string; status: string }[];
const shipped = tools.filter((t) => t.status === "shipped");

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

test("a Coming soon tile is not a link and cannot be clicked into a tool", async ({ page }) => {
  await page.goto("./");
  const tile = page.locator(".nt-card-off").first();
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute("aria-disabled", "true");
  await expect(tile.getByText("Coming soon")).toBeVisible();
  expect(await tile.evaluate((el) => el.closest("a"))).toBeNull();
  // Only shipped tools are links, and none of them says Coming soon.
  await expect(page.locator("a.nt-card")).toHaveCount(shipped.length);
  await expect(page.locator("a.nt-card", { hasText: "Coming soon" })).toHaveCount(0);
  await expect(page.locator(".nt-card-off")).toHaveCount(tools.length - shipped.length);

  await tile.click();
  await expect(page).toHaveURL(/\/nt\/$|\/nt\/#\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
