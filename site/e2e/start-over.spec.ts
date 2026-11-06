import { expect, test } from "@playwright/test";
import { openMoreOptions } from "./answer-first";

test.use({ viewport: { width: 390, height: 844 } });

const TOOLS = [
  "loan-explainer",
  "loan-offer-compare",
  "mortgage-payment-explainer",
  "student-loan-growth-and-payoff",
  "monthly-budget",
  "unit-converter",
];

for (const id of TOOLS) {
  test(`${id}: Start over clears the boxes and Put it back restores them`, async ({ page }) => {
    await page.goto(`#/tools/${id}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // The budget page starts with a name box (Pay), so use its first amount box.
    const boxes = page.locator("input.nt-field-input");
    const box = id === "monthly-budget" ? boxes.nth(1) : boxes.first();
    await expect(box).toBeVisible();
    // Nothing is typed, so Start over is hidden. Typing a number brings it in.
    await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
    await box.fill("1234");
    await expect(box).toHaveValue("1234");
    // Start over waits inside a closed "More options" box, with a short note that it can be undone.
    const more = page.locator("details.nt-more");
    await expect(more.locator("summary")).toHaveText("More options");
    await expect(more).toHaveJSProperty("open", false);
    await expect(page.getByRole("button", { name: "Start over" })).toBeHidden();
    await openMoreOptions(page);
    await expect(page.locator(".nt-startover-note")).toBeVisible();
    await expect(page.locator(".nt-startover-note")).toHaveText("You can put your numbers back.");
    if (id === "monthly-budget") {
      // The budget has its own always-visible line about Remove, under the lists.
      await expect(page.getByText("Remove asks first, and you can put the line back.", { exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Clear the boxes" }).click();
    await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
    // The Put it back message shows outside the details.
    await expect(page.locator("details.nt-more")).toHaveCount(0);
    await expect(box).toHaveValue("");
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("nt:flow:")))).toEqual([]);

    await page.getByRole("button", { name: "Put it back" }).click();
    await expect(box).toHaveValue("1234");
    await expect(page.getByText(/Your numbers are cleared\./)).toHaveCount(0);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(wide).toBe(false);
  });
}
