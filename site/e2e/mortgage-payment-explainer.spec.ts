import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { expectAnsweredButtons, expectSeeHiddenWhenWide, expectTrustLine, expectWaitingButtons, openMoreOptions } from "./answer-first";

// The golden answers come from tools/mortgage-payment-explainer/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

type Page = import("@playwright/test").Page;

// The boxes open empty. fill() replaces a box.
// Length is chips: "15 years", "20 years", "30 years", or "Other" with a "Years to pay it back" box.
// Tax, insurance and fees sit behind "Add tax, insurance and fees".
async function openMore(page: Page) {
  await page.getByRole("button", { name: "Add tax, insurance and fees, if you know them" }).click();
}

// The full breakdown (parts, loan length, first payment) is inside "See all the numbers".
async function openAll(page: Page) {
  await page.getByText("See all the numbers", { exact: true }).click();
  return page.locator("details").filter({ has: page.getByText("See all the numbers", { exact: true }) });
}

async function fillBasic(page: Page) {
  await page.getByLabel("Home price").fill("$300,000");
  await page.getByLabel("Down payment").fill("$60,000");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("30 years").check();
  await openMore(page);
  await page.getByLabel("Property tax for the year").fill("$3,600");
  await page.getByLabel("Home insurance for the year").fill("$1,200");
  await page.getByLabel("Neighborhood fee each month").fill("$50");
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/mortgage-payment-explainer");
  await page.getByLabel("Home price").waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Home price").waitFor();
});

test("opens with empty boxes, the waiting text and one main button that leads to the first box", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "What will my house payment be?" })).toBeVisible();
  await expect(page.getByText("Mortgage Payment Explainer", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await expect(page.getByLabel("Down payment")).toHaveValue("");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  for (const years of ["15 years", "20 years", "30 years", "Other"]) {
    await expect(page.getByLabel(years, { exact: true })).not.toBeChecked();
  }
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("Type your numbers to see your monthly payment.");
  await expect(card).not.toContainText("Example");
  await expect(page.getByText(/There is no Send button/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expectWaitingButtons(page, "See my payment", "Home price");
});

test("with an answer, Done is the one filled button, See my payment is gone, and Print or save opens the sheet", async ({ page }) => {
  await page.getByLabel("Home price").fill("300,000");
  await page.getByLabel("Down payment").fill("60,000");
  await page.getByLabel("Yearly interest rate").fill("6.5");
  await page.getByLabel("30 years").check();
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,516.96");
  await expectAnsweredButtons(page, "See my payment");
  await expectSeeHiddenWhenWide(page, "See my payment");
});

test("Start over, Clear the boxes empties the boxes and shows the waiting text", async ({ page }) => {
  await page.getByLabel("Home price").fill("250,000");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await expect(page.getByLabel("Down payment")).toHaveValue("");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await expect(page.getByLabel("Total monthly payment")).toContainText("Type your numbers to see your monthly payment.");
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});

test("gives the exact total, parts, total interest and first payment, with no sideways scroll", async ({ page }) => {
  await fillBasic(page);
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("$1,888.92");
  await expect(card).toContainText("$240,000.00");
  await expect(card).toContainText("30 years");
  // The parts and the first payment moved into "See all the numbers".
  const all = await openAll(page);
  await expect(all).toContainText("$278,012.58");
  await expect(all).toContainText("$1,438.92");
  await expect(all).toContainText("$300.00");
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
  await page.getByLabel("15 years").check();
  await openMore(page);
  await page.getByLabel("Property tax for the year").fill("2750.50");
  await page.getByLabel("Home insurance for the year").fill("1500.25");
  await page.getByLabel("Neighborhood fee each month").fill("120");
  await page.getByLabel("Mortgage insurance each month").fill("95.10");
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("$2,737.38");
  const all = await openAll(page);
  await expect(all).toContainText("$2,168.05");
  await expect(all).toContainText("$229.21");
  await expect(all).toContainText("$125.02");
  await expect(all).toContainText("$95.10");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await page.getByLabel("Home price").fill("lots of money");
  await page.getByLabel("Down payment").fill("0");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("Other", { exact: true }).check();
  await page.getByLabel("Years to pay it back").fill("30");
  await expect(page.getByText("Home price: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Total monthly payment")).toContainText("Type your numbers to see your monthly payment.");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Home price").fill("1e3");
  await expect(page.getByText("Home price: use a number above zero")).toBeVisible();
  await page.getByLabel("Home price").fill(" 1,000.50 ");
  await expect(page.getByLabel("Total monthly payment")).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  await expect(page.getByLabel("Home price")).toBeVisible();
  // Open every optional part first, so every box and chip is measured.
  await page.getByLabel("Other", { exact: true }).check();
  await openMore(page);
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  // Price, down payment, rate, years, tax, insurance, neighborhood fee, mortgage insurance.
  expect(n).toBe(8);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const buttons = page.locator(".nt-see-btn");
  expect(await buttons.count()).toBe(1);
  expect((await buttons.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const chips = page.locator(".nt-chip");
  const c = await chips.count();
  expect(c).toBe(4);
  for (let i = 0; i < c; i++) {
    const info = await chips.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("the optional boxes wait behind a button, and show on their own when they hold a number", async ({ page }) => {
  await expect(page.getByLabel("Property tax for the year")).toHaveCount(0);
  await expect(page.locator(".nt-field-input")).toHaveCount(3);
  await openMore(page);
  await expect(page.getByLabel("Property tax for the year")).toBeVisible();
  await expect(page.getByLabel("Mortgage insurance each month")).toBeVisible();
  await page.getByLabel("Property tax for the year").fill("$3,600");
  await page.reload();
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Property tax for the year")).toHaveValue("$3,600");
});

test("No thanks hides the prompt and leaves the boxes blank", async ({ page }) => {
  await page.getByLabel("Home price").fill("130000");
  await page.goto("about:blank");
  await page.goto("#/tools/mortgage-payment-explainer");
  await expect(page.getByText("Use your last numbers?")).toBeVisible();
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await expect(page.getByLabel("Total monthly payment")).toContainText("Type your numbers to see your monthly payment.");
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Home price").fill("130000");
  await page.getByLabel("Down payment").fill("10000");
  await page.getByLabel("Yearly interest rate").fill("0");
  await page.getByLabel("Other", { exact: true }).check();
  await page.getByLabel("Years to pay it back").fill("10");
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,000.00");
  await page.goto("about:blank");
  await page.goto("#/tools/mortgage-payment-explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Home price")).toHaveValue("130000");
  await expect(page.getByLabel("Years to pay it back")).toHaveValue("10");
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,000.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillBasic(page);
  await expect(page.getByLabel("Total monthly payment")).toContainText("$1,888.92");
  await page.screenshot({ path: shotPath("mortgage-payment-explainer-desktop.png"), fullPage: true });
});
