import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/savings-goal-tracker/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillWhen(page: import("@playwright/test").Page, v: { goal: string; saved: string; monthly: string; start?: string; rate?: string }) {
  await page.getByLabel("Goal amount").fill(v.goal);
  await page.getByLabel("Already saved").fill(v.saved);
  await page.getByLabel("Amount you save each month").fill(v.monthly);
  if (v.rate) await page.getByLabel("Yearly interest rate").fill(v.rate);
  if (v.start) await page.getByLabel("Start month").fill(v.start);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/savings-goal-tracker");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Goal amount")).toBeVisible();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Savings Goal Tracker" })).toBeVisible();
  await expect(page.getByText("Type your goal and what you have saved")).toBeVisible();
  await expect(page.getByLabel("Months to your goal")).toContainText("Your answer shows here");
  await expect(page.getByRole("button", { name: "Print" })).toBeDisabled();
});

test("gives the exact months and landing month, with no sideways scroll", async ({ page }) => {
  await fillWhen(page, { goal: "$5,000", saved: "500", monthly: "250", start: "2026-12" });
  const card = page.getByLabel("Months to your goal");
  await expect(card).toContainText("18 months");
  await expect(card).toContainText("May 2028");
  await expect(card).toContainText("$4,500.00");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("savings-goal-tracker-phone.png"), fullPage: true });
});

test("interest is added each month and the year table opens", async ({ page }) => {
  await fillWhen(page, { goal: "10,000", saved: "1,000", monthly: "300", rate: "4.5", start: "2026-01" });
  const card = page.getByLabel("Months to your goal");
  await expect(card).toContainText("29 months");
  await expect(card).toContainText("$587.21");
  await expect(card).toContainText("$10,287.21");
  await page.getByText("Show year by year").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(4);
});

test("how much each month for a chosen month", async ({ page }) => {
  await page.getByLabel("How much to save each month?").check();
  await page.getByLabel("Goal amount").fill("10,000");
  await page.getByLabel("Already saved").fill("1,000");
  await page.getByLabel("Start month").fill("2026-12");
  await page.getByLabel("Goal month").fill("2027-11");
  const card = page.getByLabel("Save each month", { exact: true });
  await expect(card).toContainText("$750.00");
  await expect(card).toContainText("12 months");
  await expect(card).toContainText("November 2027");
});

test("says so when the goal is reached, or nothing is saved", async ({ page }) => {
  await fillWhen(page, { goal: "5,000", saved: "6,000", monthly: "0" });
  await expect(page.getByLabel("Months to your goal")).toContainText("Already there");
  await page.getByLabel("Already saved").fill("500");
  await expect(page.getByLabel("Months to your goal")).toContainText("Not reached");
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await fillWhen(page, { goal: "lots of money", saved: "", monthly: "100" });
  await expect(page.getByText("Goal amount: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Months to your goal")).toContainText("Your answer shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Goal amount").fill("1e3");
  await expect(page.getByText("Goal amount: use a number above zero")).toBeVisible();
  await page.getByLabel("Goal amount").fill(" 1,000.50 ");
  await page.getByLabel("Start month").fill("Dec 2026");
  await expect(page.getByText("Start month: type the year")).toBeVisible();
  await page.getByLabel("Start month").fill("2026-12");
  await expect(page.getByLabel("Months to your goal")).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
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
  await fillWhen(page, { goal: "1200", saved: "0", monthly: "100" });
  await expect(page.getByLabel("Months to your goal")).toContainText("12 months");
  await page.goto("about:blank");
  await page.goto("/#/tools/savings-goal-tracker");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Goal amount")).toHaveValue("1200");
  await expect(page.getByLabel("Months to your goal")).toContainText("12 months");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillWhen(page, { goal: "5,000", saved: "500", monthly: "250", start: "2026-12" });
  await expect(page.getByLabel("Months to your goal")).toContainText("18 months");
  await page.screenshot({ path: shotPath("savings-goal-tracker-desktop.png"), fullPage: true });
});
