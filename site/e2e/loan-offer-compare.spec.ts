import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/loan-offer-compare/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

type Page = import("@playwright/test").Page;

async function fillOffer(page: Page, n: number, v: { amount: string; rate: string; term: string; fees?: string }) {
  await page.getByLabel(`Offer ${n}: Amount borrowed`).fill(v.amount);
  await page.getByLabel(`Offer ${n}: Yearly interest rate`).fill(v.rate);
  await page.getByLabel(`Offer ${n}: How long is the loan?`).fill(v.term);
  if (v.fees) await page.getByLabel(`Offer ${n}: Upfront fees`).fill(v.fees);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/loan-offer-compare");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toBeVisible();
});

test("shows an empty state that says what to type, with two offers", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Loan Offer Compare" })).toBeVisible();
  await expect(page.getByText("Type the numbers from two loan offers")).toBeVisible();
  await expect(page.getByLabel("Offer 2: Amount borrowed")).toBeVisible();
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveCount(0);
  await expect(page.getByLabel("Lowest cost of borrowing")).toContainText("Your answer shows here");
  await expect(page.getByText("Your answer shows below.")).toBeVisible();
  await expect(page.getByText(/no Send button/)).toBeVisible();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toBeFocused();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(page.locator(".primary")).toHaveCount(1);
});

test("gives the exact numbers for two offers and names the lowest, with no sideways scroll", async ({ page }) => {
  await fillOffer(page, 1, { amount: "$10,000", rate: "6", term: "36" });
  await fillOffer(page, 2, { amount: "10,000", rate: "5", term: "48", fees: "$200" });
  const one = page.getByLabel("Offer 1, monthly payment");
  await expect(one).toContainText("$304.22");
  await expect(one).toContainText("$10,951.88");
  await expect(one).toContainText("$951.88");
  const two = page.getByLabel("Offer 2, monthly payment");
  await expect(two).toContainText("$230.29");
  await expect(two).toContainText("$1,254.11");
  await expect(page.getByLabel("Lowest cost of borrowing")).toContainText("Offer 1");
  await expect(page.locator("details", { hasText: "More about the offers" })).toContainText("Lowest monthly payment: Offer 2");
  await expect(page.locator("body")).not.toContainText(/\bbest\b/i);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("loan-offer-compare-phone.png"), fullPage: true });
});

test("a third offer can be added, and a tie names every offer", async ({ page }) => {
  await fillOffer(page, 1, { amount: "5000", rate: "4", term: "24", fees: "50" });
  await fillOffer(page, 2, { amount: "5000", rate: "4", term: "24", fees: "50" });
  await expect(page.getByLabel("Lowest cost of borrowing")).toContainText("Offer 1 and Offer 2");
  await page.getByRole("button", { name: "Add a third offer" }).click();
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toBeVisible();
  await expect(page.getByLabel("Lowest cost of borrowing")).toContainText("Your answer shows here");
  await fillOffer(page, 3, { amount: "5000", rate: "3", term: "24", fees: "50" });
  await expect(page.getByLabel("Offer 3, monthly payment")).toBeVisible();
  await expect(page.locator("details", { hasText: "More about the offers" })).toContainText("Lowest monthly payment: Offer 3");
  await expect(page.getByText("Remove takes out one line. Put it back brings it back.")).toBeVisible();
  await page.getByRole("button", { name: "Remove the third offer" }).click();
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveCount(0);
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveValue("5000");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the offer and field", async ({ page }) => {
  await fillOffer(page, 1, { amount: "1000", rate: "5", term: "12" });
  await fillOffer(page, 2, { amount: "lots of money", rate: "5", term: "12" });
  await expect(page.getByText("Offer 2: Amount borrowed: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Lowest cost of borrowing")).toContainText("Your answer shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Offer 2: Amount borrowed").fill("1e3");
  await expect(page.getByText("Offer 2: Amount borrowed: use a number above zero")).toBeVisible();
  await page.getByLabel("Offer 2: Amount borrowed").fill(" 1,000.50 ");
  await expect(page.getByLabel("Lowest cost of borrowing")).toBeVisible();
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
  const add = await page.getByRole("button", { name: "Add a third offer" }).boundingBox();
  expect(add!.height).toBeGreaterThanOrEqual(44);
});

test("numbers come back after leaving", async ({ page }) => {
  await fillOffer(page, 1, { amount: "1200", rate: "0", term: "12" });
  await fillOffer(page, 2, { amount: "1200", rate: "0", term: "24" });
  await expect(page.getByLabel("Offer 1, monthly payment")).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("/#/tools/loan-offer-compare");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("1200");
  await expect(page.getByLabel("Offer 2, monthly payment")).toContainText("$50.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillOffer(page, 1, { amount: "20,000", rate: "7.25", term: "60", fees: "500" });
  await fillOffer(page, 2, { amount: "20,000", rate: "6.5", term: "60", fees: "900" });
  await page.getByRole("button", { name: "Add a third offer" }).click();
  await fillOffer(page, 3, { amount: "20,000", rate: "8", term: "48" });
  await expect(page.getByLabel("Offer 3, monthly payment")).toContainText("$488.26");
  await page.screenshot({ path: shotPath("loan-offer-compare-desktop.png"), fullPage: true });
});
