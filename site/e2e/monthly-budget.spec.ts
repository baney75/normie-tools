import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/monthly-budget/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillPlain(page: import("@playwright/test").Page) {
  await page.getByLabel("Pay, per month").fill("3,000");
  await page.getByLabel("Rent or mortgage, per month").fill("1,200");
  await page.getByLabel("Food, per month").fill("450");
  await page.getByLabel("Bills, per month").fill("300");
  await page.getByLabel("Transport, per month").fill("250");
  await page.getByLabel("Other, per month").fill("100");
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/monthly-budget");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Pay, per month")).toBeVisible();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Monthly Budget" })).toBeVisible();
  await expect(page.getByText("Type what you get and what you spend each month")).toBeVisible();
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("Your answer shows here");
  await expect(page.getByRole("button", { name: "Print" })).toBeDisabled();
});

test("gives exact totals, left over and percents, with no sideways scroll", async ({ page }) => {
  await fillPlain(page);
  const card = page.getByLabel("Left over", { exact: true });
  await expect(card).toContainText("$700.00");
  await expect(card).toContainText("$3,000.00");
  await expect(card).toContainText("$2,300.00");
  const where = page.getByRole("region", { name: "Where it goes" });
  await expect(where).toContainText("40.0% of income");
  await expect(where).toContainText("15.0% of income");
  await expect(where).toContainText("10.0% of income");
  await expect(where).toContainText("8.3% of income");
  await expect(where).toContainText("3.3% of income");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("monthly-budget-phone.png"), fullPage: true });
});

test("a negative left over shows a minus sign, and a new line can be added", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1,000");
  await page.getByLabel("Rent or mortgage, per month").fill("1,100");
  await page.getByRole("button", { name: "Add a spending item" }).click();
  await page.getByLabel("Name of spending item 6").fill("Phone");
  await page.getByLabel("Phone, per month").fill("40.50");
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("-$140.50");
  await page.getByText("Show the numbers in a table").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the line", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3000");
  await page.getByLabel("Food, per month").fill("lots of money");
  await expect(page.getByText("Food: use a dollar amount")).toBeVisible();
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("Your answer shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Food, per month").fill("1e3");
  await expect(page.getByText("Food: use a dollar amount")).toBeVisible();
  await page.getByLabel("Food, per month").fill(" 1,000.50 ");
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("$1,999.50");
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(12);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const buttons = page.locator(".nt-budget-remove, .nt-budget-add");
  for (let i = 0; i < (await buttons.count()); i++) {
    const h = await buttons.nth(i).evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  }
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1200");
  await page.getByLabel("Food, per month").fill("200");
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("$1,000.00");
  await page.goto("about:blank");
  await page.goto("#/tools/monthly-budget");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Pay, per month")).toHaveValue("1200");
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("$1,000.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillPlain(page);
  await expect(page.getByLabel("Left over", { exact: true })).toContainText("$700.00");
  await page.screenshot({ path: shotPath("monthly-budget-desktop.png"), fullPage: true });
});
