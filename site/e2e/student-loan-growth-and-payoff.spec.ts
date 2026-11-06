import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { expectAnsweredButtons, expectSeeHiddenWhenWide, expectTrustLine, expectWaitingButtons } from "./answer-first";

// The golden answers come from tools/student-loan-growth-and-payoff/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

type Page = import("@playwright/test").Page;

// The boxes open empty. fill() replaces a box.
// School months, the unpaid-interest box, first payment month and years sit behind "Add school months and other details".
async function openMore(page: Page) {
  await page.getByRole("button", { name: "Add school months and other details" }).click();
}

// With a payment the card is "Paid off in"; without one it is "Balance when payments start".
const paidCard = (page: Page) => page.getByRole("region", { name: "Paid off in", exact: true });
const balanceCard = (page: Page) => page.getByRole("region", { name: "Balance when payments start", exact: true });

async function fillGolden(page: Page) {
  await page.getByLabel("Loan balance").fill("$20,000");
  await page.getByLabel("Yearly interest rate").fill("5");
  await page.getByLabel("Monthly payment").fill("300");
  await openMore(page);
  await page.getByLabel(/Months with no payments/).fill("6");
  await page.getByLabel(/First payment month/).fill("2026-09");
  await page.getByLabel(/Years you want/).fill("10");
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/student-loan-growth-and-payoff");
  await page.getByLabel("Loan balance").waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Loan balance").waitFor();
});

test("opens with empty boxes, the waiting text and one main button that leads to the first box", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "When will my student loan be paid off?" })).toBeVisible();
  await expect(page.getByText("Student Loan Growth and Payoff", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Loan balance")).toHaveValue("");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await expect(page.getByLabel("Monthly payment")).toHaveValue("");
  const card = balanceCard(page);
  await expect(card).toContainText("Type your numbers to see your answer.");
  await expect(card).not.toContainText("Example");
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expectWaitingButtons(page, "See my answer", "Loan balance");
});

test("with an answer, Done is the one filled button, See my answer is gone, and Print or save opens the sheet", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("20,000");
  await page.getByLabel("Yearly interest rate").fill("5.5");
  await page.getByLabel("Monthly payment").fill("250");
  await expect(paidCard(page)).toContainText(/\d+ years?(, \d+ months?)?/);
  await expectAnsweredButtons(page, "See my answer");
  await expectSeeHiddenWhenWide(page, "See my answer");
});

test("without a payment the card shows the balance when payments start", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("20,000");
  await page.getByLabel("Yearly interest rate").fill("5.5");
  await expect(paidCard(page)).toHaveCount(0);
  await expect(balanceCard(page)).toContainText("$20,000.00");
});

test("gives the exact balance, months, interest, payoff month and smallest payment, with no sideways scroll", async ({ page }) => {
  await fillGolden(page);
  // With a payment the card leads with how long it takes: 81 months.
  const card = paidCard(page);
  await expect(card).toContainText("6 years, 9 months");
  await expect(card).toContainText("May 2033");
  await expect(card).toContainText("$4,171.44");
  // Six months with no payments let interest grow, so the card shows the balance when payments start.
  await expect(card).toContainText("Paying $300.00 a month.");
  await expect(card).toContainText("Balance when payments start");
  await expect(card).toContainText("$20,499.98");
  // The balance, unpaid interest, month count and the rest are in the details below.
  await page.getByText("See year by year", { exact: true }).click();
  const all = page.locator("details").filter({ has: page.getByText("See year by year", { exact: true }) });
  await expect(all).toContainText("$20,499.98");
  await expect(all).toContainText("$499.98");
  await expect(all).toContainText("81");
  await expect(all).toContainText("$4,171.44");
  await expect(all).toContainText("May 2033");
  await expect(all).toContainText("$217.39");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("student-loan-growth-and-payoff-phone.png"), fullPage: true });
});

test("the toggle adds the unpaid interest to the balance", async ({ page }) => {
  await fillGolden(page);
  await page.getByLabel(/Add the unpaid interest/).check();
  const card = paidCard(page);
  await expect(card).toContainText("$4,176.47");
  // The smallest payment now sits in the details below the card.
  await page.getByText("See year by year", { exact: true }).click();
  const all = page.locator("details").filter({ has: page.getByText("See year by year", { exact: true }) });
  await expect(all).toContainText("$217.44");
});

test("with a payment and no wait months the card shows Paying and Total interest, with no starting balance line", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("20,000");
  await page.getByLabel("Yearly interest rate").fill("5");
  await page.getByLabel("Monthly payment").fill("300");
  const card = paidCard(page);
  await expect(card).toContainText("Paying $300.00 a month.");
  await expect(card).toContainText("Total interest");
  await expect(card).not.toContainText("Balance when payments start");
});

test("year sections open", async ({ page }) => {
  await fillGolden(page);
  await page.getByText("See year by year", { exact: true }).click();
  await expect(page.locator(".nt-slg-year")).toHaveCount(7);
  await expect(page.locator(".nt-slg-year").nth(6)).toContainText("$0.00");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("lots of money");
  await page.getByLabel("Yearly interest rate").fill("5");
  await expect(page.getByText("Loan balance: use a number above zero")).toBeVisible();
  await expect(balanceCard(page)).toContainText("Type your numbers to see your answer.");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Loan balance").fill("1e3");
  await expect(page.getByText("Loan balance: use a number above zero")).toBeVisible();
  await page.getByLabel("Loan balance").fill(" 1,000.50 ");
  await expect(balanceCard(page)).toBeVisible();
  await openMore(page);
  await page.getByLabel(/First payment month/).fill("9/2026");
  await expect(page.getByText(/Payments start: type the year/)).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  await expect(page.getByLabel("Loan balance")).toBeVisible();
  await expect(page.locator(".nt-field-input")).toHaveCount(3);
  const see = page.locator(".nt-see-btn");
  expect(await see.count()).toBe(1);
  expect((await see.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // Open the optional part first, so every box is measured.
  await openMore(page);
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(6);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("No thanks hides the prompt and leaves the boxes blank", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("1200");
  await page.goto("about:blank");
  await page.goto("#/tools/student-loan-growth-and-payoff");
  await expect(page.getByText("Use your last numbers?")).toBeVisible();
  await expect(page.getByLabel("Loan balance")).toHaveValue("");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Loan balance")).toHaveValue("");
  await expect(balanceCard(page)).toContainText("Type your numbers to see your answer.");
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("1200");
  await page.getByLabel("Yearly interest rate").fill("0");
  await page.getByLabel("Monthly payment").fill("");
  await expect(balanceCard(page)).toContainText("$1,200.00");
  await page.goto("about:blank");
  await page.goto("#/tools/student-loan-growth-and-payoff");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Loan balance")).toHaveValue("1200");
  await expect(balanceCard(page)).toContainText("$1,200.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillGolden(page);
  await expect(paidCard(page)).toContainText("May 2033");
  await page.screenshot({ path: shotPath("student-loan-growth-and-payoff-desktop.png"), fullPage: true });
});
