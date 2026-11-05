import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/student-loan-growth-and-payoff/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillGolden(page: import("@playwright/test").Page) {
  await page.getByLabel("Loan balance").fill("$20,000");
  await page.getByLabel("Yearly interest rate").fill("5");
  await page.getByLabel(/Months with no payments/).fill("6");
  await page.getByLabel("Monthly payment").fill("300");
  await page.getByLabel(/First payment month/).fill("2026-09");
  await page.getByLabel(/Years you want/).fill("10");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/student-loan-growth-and-payoff");
  await page.getByLabel("Loan balance").waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Loan balance").waitFor();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Student Loan Growth and Payoff" })).toBeVisible();
  await expect(page.getByText("Type what you owe and the yearly interest rate")).toBeVisible();
  await expect(page.getByRole("region", { name: "Balance when payments start", exact: true })).toContainText("Your answer shows here");
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
});

test("gives the exact balance, months, interest, payoff month and smallest payment, with no sideways scroll", async ({ page }) => {
  await fillGolden(page);
  const card = page.getByRole("region", { name: "Balance when payments start", exact: true });
  await expect(card).toContainText("$20,499.98");
  await expect(card).toContainText("$499.98");
  await expect(card).toContainText("81");
  await expect(card).toContainText("$4,171.44");
  await expect(card).toContainText("May 2033");
  await expect(card).toContainText("$217.39");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("student-loan-growth-and-payoff-phone.png"), fullPage: true });
});

test("the toggle adds the unpaid interest to the balance", async ({ page }) => {
  await fillGolden(page);
  await page.getByLabel(/Add the unpaid interest/).check();
  const card = page.getByRole("region", { name: "Balance when payments start", exact: true });
  await expect(card).toContainText("$4,176.47");
  await expect(card).toContainText("$217.44");
});

test("year sections open", async ({ page }) => {
  await fillGolden(page);
  await page.getByText("Show year by year").click();
  await expect(page.locator(".nt-slg-year")).toHaveCount(7);
  await expect(page.locator(".nt-slg-year").nth(6)).toContainText("$0.00");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("lots of money");
  await page.getByLabel("Yearly interest rate").fill("5");
  await expect(page.getByText("Loan balance: use a number above zero")).toBeVisible();
  await expect(page.getByRole("region", { name: "Balance when payments start", exact: true })).toContainText("Your answer shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Loan balance").fill("1e3");
  await expect(page.getByText("Loan balance: use a number above zero")).toBeVisible();
  await page.getByLabel("Loan balance").fill(" 1,000.50 ");
  await expect(page.getByRole("region", { name: "Balance when payments start", exact: true })).toBeVisible();
  await page.getByLabel(/First payment month/).fill("9/2026");
  await expect(page.getByText(/Payments start: type the year/)).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(6);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("1200");
  await page.getByLabel("Yearly interest rate").fill("0");
  await expect(page.getByRole("region", { name: "Balance when payments start", exact: true })).toContainText("$1,200.00");
  await page.goto("about:blank");
  await page.goto("/#/tools/student-loan-growth-and-payoff");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Loan balance")).toHaveValue("1200");
  await expect(page.getByRole("region", { name: "Balance when payments start", exact: true })).toContainText("$1,200.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillGolden(page);
  await expect(page.getByRole("region", { name: "Balance when payments start", exact: true })).toContainText("$20,499.98");
  await page.screenshot({ path: shotPath("student-loan-growth-and-payoff-desktop.png"), fullPage: true });
});
