import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

test("answers are saved and the person can pick up where they left off", async ({ page }) => {
  await page.goto("/#/harness");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel("Your name").fill("Pat");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Step 2 of 3" })).toBeVisible();

  // Leave and come back.
  await page.goto("about:blank");
  await page.goto("/#/harness");
  await expect(page.getByRole("heading", { name: "Pick up where you left off?" })).toBeVisible();
  await expect(page.getByText("You were on Step 2 of 3: Your file.")).toBeVisible();

  await page.getByRole("button", { name: "Pick up" }).click();
  await expect(page.getByRole("heading", { name: "Step 2 of 3" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("Pat");
});

test("start over asks first and then clears the saved answers", async ({ page }) => {
  await page.goto("/#/harness");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Your name").fill("Pat");
  await page.getByRole("button", { name: "Next" }).click();

  await page.goto("about:blank");
  await page.goto("/#/harness");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByText("Your saved answers will be cleared.")).toBeVisible();
  await page.getByRole("button", { name: "Yes, start over" }).click();
  await expect(page.getByRole("heading", { name: "Step 1 of 3" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("");
});
