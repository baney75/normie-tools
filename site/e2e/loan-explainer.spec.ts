import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/loan-explainer/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillLoan(page: import("@playwright/test").Page, v: { amount: string; rate: string; term: string }) {
  await page.getByLabel("Amount borrowed").fill(v.amount);
  await page.getByLabel("Yearly interest rate").fill(v.rate);
  await page.getByLabel("How long is the loan?").fill(v.term);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/loan-explainer");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Loan Explainer" })).toBeVisible();
  await expect(page.getByText("Type the numbers from your loan")).toBeVisible();
  await expect(page.getByText("Your answer shows below.")).toBeVisible();
  await expect(page.getByText(/stay on this phone/)).toBeVisible();
  await expect(page.getByLabel("Amount borrowed")).toBeFocused();
  await expect(page.getByLabel("Monthly payment")).toContainText("Your answer shows here");
});

test("gives the exact monthly payment, total paid and interest, with no sideways scroll", async ({ page }) => {
  await fillLoan(page, { amount: "$10,000", rate: "6", term: "36" });
  const card = page.getByLabel("Monthly payment");
  await expect(card).toContainText("$304.22");
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(page.locator(".primary")).toHaveCount(1);
  await expect(card).toContainText("$10,951.88");
  await expect(card).toContainText("$951.88");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("loan-explainer-phone.png"), fullPage: true });
});

// Both answers are worked out apart from the page: a payment rounded to the cent, then a month by month
// schedule where the last payment clears what is left (Python Decimal, round half up).
test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await fillLoan(page, { amount: "10000", rate: "6", term: "36" });
  const card = page.getByLabel("Monthly payment");
  await expect(card).toContainText("$304.22");
  await expect(card).toContainText("$10,951.88");
  await fillLoan(page, { amount: "12000", rate: "6.5", term: "36" });
  await expect(card).toContainText("$367.79");
  await expect(card).toContainText("$13,240.36");
  await expect(card).not.toContainText("$304.22");
});

test("extra payment shows months and interest saved, and the by-year table opens", async ({ page }) => {
  await fillLoan(page, { amount: "20,000", rate: "7.25", term: "5" });
  await page.getByLabel("Years").check();
  await page.getByLabel("Upfront fees").fill("$500");
  await page.getByLabel("Extra each month").fill("$100");
  await expect(page.getByLabel("Monthly payment")).toContainText("$398.39");
  await expect(page.getByLabel("Monthly payment")).toContainText("$4,403.20");
  const extra = page.getByRole("region", { name: "With your extra payment" });
  await expect(extra).toContainText("47 months");
  await expect(extra).toContainText("13");
  await page.getByText("Show the year by year table").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(5);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await fillLoan(page, { amount: "lots of money", rate: "6", term: "36" });
  await expect(page.getByText("Amount borrowed: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Monthly payment")).toContainText("Your answer shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Amount borrowed").fill("1e3");
  await expect(page.getByText("Amount borrowed: use a number above zero")).toBeVisible();
  await page.getByLabel("Amount borrowed").fill(" 1,000.50 ");
  await expect(page.getByLabel("Monthly payment")).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  await expect(page.getByLabel("Amount borrowed")).toBeVisible();
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(5);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("numbers come back after leaving", async ({ page }) => {
  await fillLoan(page, { amount: "1200", rate: "0", term: "12" });
  await expect(page.getByLabel("Monthly payment")).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("/#/tools/loan-explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
  await expect(page.getByLabel("Monthly payment")).toContainText("$100.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillLoan(page, { amount: "200,000", rate: "6.5", term: "30" });
  await page.getByLabel("Years").check();
  await expect(page.getByLabel("Monthly payment")).toContainText("$1,264.14");
  await page.screenshot({ path: shotPath("loan-explainer-desktop.png"), fullPage: true });
});

test("Start over asks first and can be undone", async ({ page }) => {
  await fillLoan(page, { amount: "1200", rate: "0", term: "12" });
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Keep my numbers" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
});
