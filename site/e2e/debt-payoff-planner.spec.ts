import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/debt-payoff-planner/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillTwo(page: import("@playwright/test").Page) {
  await page.getByLabel("Debt 1 balance").fill("800");
  await page.getByLabel("Debt 1 yearly interest rate").fill("3");
  await page.getByLabel("Debt 1 smallest monthly payment").fill("30");
  await page.getByLabel("Debt 2 balance").fill("$12,000");
  await page.getByLabel("Debt 2 yearly interest rate").fill("27.99");
  await page.getByLabel("Debt 2 smallest monthly payment").fill("300");
  await page.getByLabel("Extra each month").fill("200");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/debt-payoff-planner");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Debt 1 balance")).toBeVisible();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Debt Payoff Planner" })).toBeVisible();
  await expect(page.getByText("Start with one debt")).toBeVisible();
  await expect(page.getByLabel("Interest difference between the two plans")).toHaveCount(0);
});

test("gives the exact months, interest and order for both plans, with no sideways scroll", async ({ page }) => {
  await fillTwo(page);
  await expect(page.getByLabel("Interest difference between the two plans")).toContainText("$361.25");
  const snow = page.getByRole("region", { name: "Snowball plan" });
  await expect(snow).toContainText("36 months");
  await expect(snow).toContainText("$6,162.19");
  await expect(snow).toContainText("Debt 1: paid off in month 4");
  const aval = page.getByRole("region", { name: "Avalanche plan" });
  await expect(aval).toContainText("$5,800.94");
  await expect(aval).toContainText("Debt 1: paid off in month 28");
  await expect(aval).toContainText("Debt 2: paid off in month 36");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("debt-payoff-planner-phone.png"), fullPage: true });
});

test("adds a third debt and opens the details", async ({ page }) => {
  await fillTwo(page);
  await page.getByRole("button", { name: "Add another debt" }).click();
  await expect(page.getByLabel("Debt 3 balance")).toBeVisible();
  await page.getByText("Show more").click();
  await expect(page.getByRole("table")).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("a smallest payment that does not cover the interest is said plainly", async ({ page }) => {
  await page.getByLabel("Debt 1 balance").fill("10,000");
  await page.getByLabel("Debt 1 yearly interest rate").fill("24");
  await page.getByLabel("Debt 1 smallest monthly payment").fill("200");
  await expect(page.getByText("does not cover the first month's interest")).toBeVisible();
  await expect(page.getByLabel("Interest difference between the two plans")).toHaveCount(0);
});

test("messy typing shows a calm error that names the debt and field", async ({ page }) => {
  await page.getByLabel("Debt 1 balance").fill("lots of money");
  await page.getByLabel("Debt 1 yearly interest rate").fill("6");
  await page.getByLabel("Debt 1 smallest monthly payment").fill("50");
  await expect(page.getByText("Debt 1 balance: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Interest difference between the two plans")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Debt 1 balance").fill("1e3");
  await expect(page.getByText("Debt 1 balance: use a number above zero")).toBeVisible();
  await page.getByLabel("Debt 1 balance").fill(" 1,000.50 ");
  await expect(page.getByLabel("Interest difference between the two plans")).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(9); // two debts of four boxes, plus the extra
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const button = await page.getByRole("button", { name: "Add another debt" }).evaluate((el) => el.getBoundingClientRect().height);
  expect(button).toBeGreaterThanOrEqual(44);
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Debt 1 balance").fill("1200");
  await page.getByLabel("Debt 1 yearly interest rate").fill("0");
  await page.getByLabel("Debt 1 smallest monthly payment").fill("100");
  await expect(page.getByRole("region", { name: "Snowball plan" })).toContainText("12 months");
  await page.goto("about:blank");
  await page.goto("/#/tools/debt-payoff-planner");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Debt 1 balance")).toHaveValue("1200");
  await expect(page.getByRole("region", { name: "Snowball plan" })).toContainText("12 months");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillTwo(page);
  await expect(page.getByLabel("Interest difference between the two plans")).toContainText("$361.25");
  await page.screenshot({ path: shotPath("debt-payoff-planner-desktop.png"), fullPage: true });
});
