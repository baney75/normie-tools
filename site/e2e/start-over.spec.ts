import { expect, test } from "@playwright/test";

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
    await box.fill("1234");
    await expect(box).toHaveValue("1234");
    await expect(page.getByText("Start over asks first, and you can undo it right after.")).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Clear the boxes" }).click();
    await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
    await expect(box).toHaveValue("");
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("nt:flow:")))).toEqual([]);

    await page.getByRole("button", { name: "Put it back" }).click();
    await expect(box).toHaveValue("1234");
    await expect(page.getByText(/Your numbers are cleared\./)).toHaveCount(0);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(wide).toBe(false);
  });
}
