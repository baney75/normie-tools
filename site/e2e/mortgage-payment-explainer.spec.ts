import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/mortgage-payment-explainer/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillBasic(page: import("@playwright/test").Page) {
  await page.getByLabel("Home price").fill("$300,000");
  await page.getByLabel("Down payment").fill("$60,000");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("Years to pay it back").fill("30");
  await page.getByLabel("Property tax for the year").fill("$3,600");
  await page.getByLabel("Home insurance for the year").fill("$1,200");
  await page.getByLabel("Neighborhood fee each month").fill("$50");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/mortgage-payment-explainer");
  await page.getByLabel("Home price").waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Home price").waitFor();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Mortgage Payment Explainer" })).toBeVisible();
  await expect(page.getByText("Type the numbers for a home loan. Your answer shows below.")).toBeVisible();
  await expect(page.getByLabel("Total monthly payment")).toContainText("Your answer shows here");
  await expect(page.getByText(/no Send button/)).toBeVisible();
  await expect(page.getByLabel("Home price")).toBeFocused();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(page.locator(".primary")).toHaveCount(1);
});

test("gives the exact total, parts, total interest and first payment, with no sideways scroll", async ({ page }) => {
  await fillBasic(page);
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("$1,888.92");
  await expect(card).toContainText("$1,438.92");
  await expect(card).toContainText("$300.00");
  await expect(card).toContainText("$240,000.00");
  await expect(card).toContainText("$278,012.58");
  const first = page.getByRole("region", { name: "Your first payment" });
  await expect(first).toContainText("$1,200.00");
  await expect(first).toContainText("$238.92");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("mortgage-payment-explainer-phone.png"), fullPage: true });
});

test("quick year picks and mortgage insurance work", async ({ page }) => {
  await page.getByLabel("Home price").fill("250,000");
  await page.getByLabel("Down payment").fill("12,500");
  await page.getByLabel("Yearly interest rate").fill("7.25");
  await page.getByRole("button", { name: "15 years" }).click();
  await page.getByLabel("Property tax for the year").fill("2750.50");
  await page.getByLabel("Home insurance for the year").fill("1500.25");
  await page.getByLabel("Neighborhood fee each month").fill("120");
  await page.getByLabel("Mortgage insurance each month").fill("95.10");
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("$2,737.38");
  await expect(card).toContainText("$2,168.05");
  await expect(card).toContainText("$229.21");
  await expect(card).toContainText("$125.02");
  await expect(card).toContainText("$95.10");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await page.getByLabel("Home price").fill("lots of money");
  await page.getByLabel("Down payment").fill("0");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("Years to pay it back").fill("30");
  await expect(page.getByText("Home price: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Total monthly payment")).toContainText("Your answer shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Home price").fill("1e3");
  await expect(page.getByText("Home price: use a number above zero")).toBeVisible();
  await page.getByLabel("Home price").fill(" 1,000.50 ");
  await expect(page.getByLabel("Total monthly payment")).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(8);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const picks = page.locator(".nt-mort-pick");
  for (let i = 0; i < (await picks.count()); i++) {
    const h = await picks.nth(i).evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  }
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Home price").fill("130000");
  await page.getByLabel("Down payment").fill("10000");
  await page.getByLabel("Yearly interest rate").fill("0");
  await page.getByLabel("Years to pay it back").fill("10");
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,000.00");
  await page.goto("about:blank");
  await page.goto("/#/tools/mortgage-payment-explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Home price")).toHaveValue("130000");
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,000.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillBasic(page);
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,888.92");
  await page.screenshot({ path: shotPath("mortgage-payment-explainer-desktop.png"), fullPage: true });
});
