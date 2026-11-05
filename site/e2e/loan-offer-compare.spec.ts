import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { expectAnsweredButtons, expectSeeHiddenWhenWide, expectTrustLine, expectWaitingButtons, openMoreOptions } from "./answer-first";

// The golden answers come from tools/loan-offer-compare/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

type Page = import("@playwright/test").Page;

// The page opens with two empty offers. fill() replaces a box.
// Each offer keeps a length box plus Months/Years chips inside its "Offer N" group, so say which one.
async function fillOffer(page: Page, n: number, v: { amount: string; rate: string; term: string; unit?: "Months" | "Years"; fees?: string }) {
  await page.getByLabel(`Offer ${n}: Amount borrowed`).fill(v.amount);
  await page.getByLabel(`Offer ${n}: Yearly interest rate`).fill(v.rate);
  await page.getByLabel(`Offer ${n}: How long is the loan?`).fill(v.term);
  await page.getByRole("group", { name: `Offer ${n}`, exact: true }).getByLabel(v.unit ?? "Months", { exact: true }).check();
  // Fees are optional: empty means none.
  await page.getByLabel(`Offer ${n}: Upfront fees`).fill(v.fees ?? "");
}

// The full table is inside "See all the numbers".
async function openAll(page: Page) {
  await page.getByText("See all the numbers", { exact: true }).click();
  return page.locator("details").filter({ has: page.getByText("See all the numbers", { exact: true }) });
}

const cardName = "Costs less in all";

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/loan-offer-compare");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toBeVisible();
});

test("opens with empty offers, the waiting text and one main button that leads to the first box", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Which loan offer is cheaper?" })).toBeVisible();
  await expect(page.getByText("Loan Offer Compare", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  for (const n of [1, 2]) {
    await expect(page.getByLabel(`Offer ${n}: Amount borrowed`)).toHaveValue("");
    await expect(page.getByLabel(`Offer ${n}: Yearly interest rate`)).toHaveValue("");
    await expect(page.getByLabel(`Offer ${n}: How long is the loan?`)).toHaveValue("");
  }
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveCount(0);
  const card = page.getByLabel(cardName);
  await expect(card).toContainText("Type both offers to see which costs less.");
  await expect(card).not.toContainText("Example");
  await expect(page.locator(".nt-tool-trust").getByText(/There is no Send button on this page/)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expectWaitingButtons(page, "See which costs less", "Offer 1: Amount borrowed");
});

test("with an answer, Done is the one filled button, See which costs less is gone, and Print or save opens the sheet", async ({ page }) => {
  await fillOffer(page, 1, { amount: "12,000", rate: "7.5", term: "3", unit: "Years" });
  await fillOffer(page, 2, { amount: "12,000", rate: "6.9", term: "3", unit: "Years", fees: "400" });
  await expect(page.getByLabel(cardName)).toContainText("Offer 2");
  await expectAnsweredButtons(page, "See which costs less");
  await expectSeeHiddenWhenWide(page, "See which costs less");
});

test("Start over, Clear the boxes empties the boxes and shows the waiting text", async ({ page }) => {
  await page.getByLabel("Offer 1: Amount borrowed").fill("10,000");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Offer 2: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel(cardName)).toContainText("Type both offers to see which costs less.");
});

test("gives the exact numbers for two offers and names the lowest, with no sideways scroll", async ({ page }) => {
  await fillOffer(page, 1, { amount: "$10,000", rate: "6", term: "36" });
  await fillOffer(page, 2, { amount: "10,000", rate: "5", term: "48", fees: "$200" });
  const card = page.getByLabel(cardName);
  // The card holds the answer and each offer's monthly payment.
  await expect(card).toContainText("Offer 1");
  await expect(card).toContainText("Offer 1, each month");
  await expect(card).toContainText("$304.22");
  await expect(card).toContainText("Offer 2, each month");
  await expect(card).toContainText("$230.29");
  // The full table is in "See all the numbers".
  const all = await openAll(page);
  const row = (name: string) => all.getByRole("row", { name: new RegExp(name) });
  await expect(row("Total paid")).toContainText("$10,951.88");
  await expect(row("Total interest")).toContainText("$951.88");
  await expect(row("Cost of borrowing")).toContainText("$951.88");
  await expect(row("Cost of borrowing")).toContainText("$1,254.11");
  await expect(all).toContainText("Lowest monthly payment: Offer 2");
  await expect(page.locator("body")).not.toContainText(/\bbest\b/i);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("loan-offer-compare-phone.png"), fullPage: true });
});

test("a third offer can be added, and a tie names every offer", async ({ page }) => {
  await fillOffer(page, 1, { amount: "5000", rate: "4", term: "24", fees: "50" });
  await fillOffer(page, 2, { amount: "5000", rate: "4", term: "24", fees: "50" });
  await expect(page.getByLabel(cardName)).toContainText("Offer 1 and Offer 2");
  await page.getByRole("button", { name: "Add a third offer" }).click();
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toBeVisible();
  await expect(page.getByLabel(cardName)).toContainText("Type both offers to see which costs less.");
  await fillOffer(page, 3, { amount: "5000", rate: "3", term: "24", fees: "50" });
  await expect(page.getByLabel(cardName)).toContainText("Offer 3, each month");
  const all = await openAll(page);
  await expect(all).toContainText("Lowest monthly payment: Offer 3");
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
  await expect(page.getByLabel("Costs less in all")).toContainText("Type both offers to see which costs less.");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Offer 2: Amount borrowed").fill("1e3");
  await expect(page.getByText("Offer 2: Amount borrowed: use a number above zero")).toBeVisible();
  await page.getByLabel("Offer 2: Amount borrowed").fill(" 1,000.50 ");
  await expect(page.getByLabel("Costs less in all")).toBeVisible();
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
  const buttons = page.locator(".nt-see-btn");
  expect(await buttons.count()).toBe(1);
  expect((await buttons.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const chips = page.locator(".nt-chip");
  const c = await chips.count();
  // Months and Years for each of the two offers.
  expect(c).toBe(4);
  for (let i = 0; i < c; i++) {
    const info = await chips.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const add = await page.getByRole("button", { name: "Add a third offer" }).boundingBox();
  expect(add!.height).toBeGreaterThanOrEqual(44);
});

test("No thanks hides the prompt and leaves the boxes blank", async ({ page }) => {
  await page.getByLabel("Offer 1: Amount borrowed").fill("1200");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-offer-compare");
  await expect(page.getByText("Use your last numbers?")).toBeVisible();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel(cardName)).toContainText("Type both offers to see which costs less.");
});

test("numbers come back after leaving", async ({ page }) => {
  await fillOffer(page, 1, { amount: "1200", rate: "0", term: "12" });
  await fillOffer(page, 2, { amount: "1200", rate: "0", term: "24" });
  await expect(page.getByLabel(cardName)).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-offer-compare");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("1200");
  await expect(page.getByLabel("Offer 1: How long is the loan?")).toHaveValue("12");
  await expect(page.getByLabel(cardName)).toContainText("$50.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillOffer(page, 1, { amount: "20,000", rate: "7.25", term: "60", fees: "500" });
  await fillOffer(page, 2, { amount: "20,000", rate: "6.5", term: "60", fees: "900" });
  await page.getByRole("button", { name: "Add a third offer" }).click();
  await fillOffer(page, 3, { amount: "20,000", rate: "8", term: "48" });
  await expect(page.getByLabel(cardName)).toContainText("$488.26");
  await page.screenshot({ path: shotPath("loan-offer-compare-desktop.png"), fullPage: true });
});
