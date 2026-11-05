import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { expectAnsweredButtons, expectSeeHiddenWhenWide, expectTrustLine, expectWaitingButtons, openMoreOptions } from "./answer-first";

// The golden answers come from tools/loan-explainer/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

type Page = import("@playwright/test").Page;

// The boxes open empty. fill() replaces what is in a box.
// Length is chips: "2 years".."5 years", or "Other" with a number box and Months/Years chips.
async function fillLoan(page: Page, v: { amount: string; rate: string; term: string; unit?: "Months" | "Years" }) {
  await page.getByLabel("Amount borrowed").fill(v.amount);
  await page.getByLabel("Yearly interest rate").fill(v.rate);
  const quick = v.unit === "Years" && ["2", "3", "4", "5"].includes(v.term);
  if (quick) {
    await page.getByLabel(`${v.term} years`).check();
  } else {
    await page.getByLabel("Other", { exact: true }).check();
    await page.getByLabel("Length of the loan").fill(v.term);
    await page.getByLabel(v.unit ?? "Months", { exact: true }).check();
  }
}

async function openMore(page: Page) {
  await page.getByRole("button", { name: "Add fees or extra payments, if you have them" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/loan-explainer");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("opens with empty boxes, the waiting text and one main button that leads to the first box", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "What will my loan cost?" })).toBeVisible();
  await expect(page.getByText("Loan Explainer", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  for (const years of ["2 years", "3 years", "4 years", "5 years", "Other"]) {
    await expect(page.getByLabel(years, { exact: true })).not.toBeChecked();
  }
  await expect(page.getByLabel("Amount borrowed")).not.toBeFocused();
  const card = page.getByLabel("Monthly payment");
  await expect(card).toContainText("Type your numbers to see your monthly payment.");
  await expect(card).not.toContainText("Example");
  await expect(page.locator(".nt-tool-trust").getByText(/There is no Send button on this page/)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expectWaitingButtons(page, "See my payment", "Amount borrowed");
});

test("with an answer, Done is the one filled button, See my payment is gone, and Print or save opens the sheet", async ({ page }) => {
  await fillLoan(page, { amount: "12,000", rate: "6.5", term: "3", unit: "Years" });
  await expect(page.getByLabel("Monthly payment")).toContainText("$367.79");
  await expectAnsweredButtons(page, "See my payment");
  await expectSeeHiddenWhenWide(page, "See my payment");
});

test("Start over, Clear the boxes empties the boxes and shows the waiting text", async ({ page }) => {
  await page.getByLabel("Amount borrowed").fill("10,000");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await expect(page.getByLabel("Monthly payment")).toContainText("Type your numbers to see your monthly payment.");
});

test("gives the exact monthly payment, total paid and interest, with no sideways scroll", async ({ page }) => {
  await fillLoan(page, { amount: "$10,000", rate: "6", term: "36" });
  const card = page.getByLabel("Monthly payment");
  await expect(card).toContainText("$304.22");
  // The one filled element is Done. Print or save opens Print and Save a copy in place.
  await expect(page.locator(".primary")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Done. Back to home.", exact: true })).toHaveClass(/primary/);
  await page.getByRole("button", { name: "Print or save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a copy" })).toBeVisible();
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
  await fillLoan(page, { amount: "20,000", rate: "7.25", term: "5", unit: "Years" });
  await openMore(page);
  await page.getByLabel("Upfront fees").fill("$500");
  await page.getByLabel("Extra each month").fill("$100");
  await expect(page.getByLabel("Monthly payment")).toContainText("$398.39");
  // Cost of borrowing (interest plus the $500 fee) now lives in "See all the numbers".
  await page.getByText("See all the numbers").click();
  await expect(page.getByLabel("See all the numbers")).toContainText("Cost of borrowing");
  await expect(page.getByLabel("See all the numbers")).toContainText("$4,403.20");
  const extra = page.getByRole("region", { name: "With your extra payment" });
  await expect(extra).toContainText("47 months");
  await expect(extra).toContainText("13");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(5);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await fillLoan(page, { amount: "lots of money", rate: "6", term: "36" });
  await expect(page.getByText("Amount borrowed: use a number above zero")).toBeVisible();
  await expect(page.getByLabel("Monthly payment")).toContainText("Type your numbers to see your monthly payment.");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Amount borrowed").fill("1e3");
  await expect(page.getByText("Amount borrowed: use a number above zero")).toBeVisible();
  await page.getByLabel("Amount borrowed").fill(" 1,000.50 ");
  await expect(page.getByLabel("Monthly payment")).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  await expect(page.getByLabel("Amount borrowed")).toBeVisible();
  // Open every optional part first, so every box and chip is measured.
  await page.getByLabel("Other", { exact: true }).check();
  await openMore(page);
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  // Amount, rate, length of the loan, fees, extra each month.
  expect(n).toBe(5);
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
  // Five length chips plus Months and Years.
  expect(c).toBe(7);
  for (let i = 0; i < c; i++) {
    const info = await chips.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("the optional boxes wait behind a button, and show on their own when they hold a number", async ({ page }) => {
  await expect(page.getByLabel("Upfront fees")).toHaveCount(0);
  await expect(page.getByLabel("Extra each month")).toHaveCount(0);
  await expect(page.locator(".nt-field-input")).toHaveCount(2);
  await openMore(page);
  await expect(page.getByLabel("Upfront fees")).toBeVisible();
  await expect(page.getByLabel("Extra each month")).toBeVisible();
  await page.getByLabel("Upfront fees").fill("$300");
  await page.reload();
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Upfront fees")).toHaveValue("$300");
});

test("No thanks hides the prompt and leaves the boxes blank, and Use them brings the saved numbers back", async ({ page }) => {
  await fillLoan(page, { amount: "1200", rate: "0", term: "12" });
  await expect(page.getByLabel("Monthly payment")).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-explainer");
  await expect(page.getByText("Use your last numbers?")).toBeVisible();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Monthly payment")).toContainText("Type your numbers to see your monthly payment.");
});

test("numbers come back after leaving", async ({ page }) => {
  await fillLoan(page, { amount: "1200", rate: "0", term: "12" });
  await expect(page.getByLabel("Monthly payment")).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
  await expect(page.getByLabel("Length of the loan")).toHaveValue("12");
  await expect(page.getByLabel("Monthly payment")).toContainText("$100.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillLoan(page, { amount: "200,000", rate: "6.5", term: "30", unit: "Years" });
  await expect(page.getByLabel("Monthly payment")).toContainText("$1,264.14");
  await page.screenshot({ path: shotPath("loan-explainer-desktop.png"), fullPage: true });
});

test("Start over asks first and can be undone", async ({ page }) => {
  await fillLoan(page, { amount: "1200", rate: "0", term: "12" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Keep my numbers" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
});
