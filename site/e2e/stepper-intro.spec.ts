import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

test("the demo flow shows where you are and moves one step at a time", async ({ page }) => {
  await page.goto("/#/harness");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Step 1 of 3" })).toBeVisible();
  await expect(page.getByText("This has 3 steps.")).toBeVisible();
  const bar = page.getByRole("progressbar", { name: "Step 1 of 3 progress" });
  await expect(bar).toHaveAttribute("value", "1");
  await expect(bar).toHaveAttribute("max", "3");
  await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Step 2 of 3" })).toBeVisible();
  await expect(page.getByText("This has 3 steps.")).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: "Step 2 of 3 progress" })).toHaveAttribute("value", "2");
});
