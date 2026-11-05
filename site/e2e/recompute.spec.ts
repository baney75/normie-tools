import { expect, test, type Page } from "@playwright/test";

// Type one set of numbers, then change them in the same visit. The answer must follow to a new answer that
// was worked out apart from the page (Python Decimal, round half up; see each note), never stay stale.
test.use({ viewport: { width: 390, height: 844 } });

async function open(page: Page, id: string) {
  await page.goto(`/#/tools/${id}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("mortgage-payment-explainer: a new rate gives the new loan payment", async ({ page }) => {
  await open(page, "mortgage-payment-explainer");
  await page.getByLabel("Home price").fill("300000");
  await page.getByLabel("Down payment").fill("60000");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("Years to pay it back").fill("30");
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("$1,438.92"); // 240,000 at 6% for 360 months
  await page.getByLabel("Yearly interest rate").fill("7");
  await expect(card).toContainText("$1,596.73"); // 240,000 at 7% for 360 months
  await expect(card).not.toContainText("$1,438.92");
});

test("monthly-budget: a new rent gives the new amount left over", async ({ page }) => {
  await open(page, "monthly-budget");
  await page.getByLabel("Pay, per month").fill("3000");
  await page.getByLabel("Rent or mortgage, per month").fill("1200");
  const card = page.getByLabel("Left over");
  await expect(card).toContainText("$1,800.00"); // 3,000.00 - 1,200.00
  await page.getByLabel("Rent or mortgage, per month").fill("1500");
  await expect(card).toContainText("$1,500.00"); // 3,000.00 - 1,500.00
  await expect(card).not.toContainText("$1,800.00");
});

test("unit-converter: a new number gives the new converted number", async ({ page }) => {
  await open(page, "unit-converter");
  await page.getByLabel("Number").fill("12");
  const card = page.getByLabel("Your answer", { exact: true });
  await expect(card).toContainText("304.8 millimeters"); // 12 x 25.4
  await page.getByLabel("Number").fill("24");
  await expect(card).toContainText("609.6 millimeters"); // 24 x 25.4
});

test("savings-goal-tracker: a bigger monthly amount gives fewer months", async ({ page }) => {
  await open(page, "savings-goal-tracker");
  await page.getByLabel("Goal amount").fill("5000");
  await page.getByLabel("Already saved").fill("500");
  await page.getByLabel("Amount you save each month").fill("250");
  const card = page.getByLabel("Months to your goal");
  await expect(card).toContainText("18 months"); // 4,500 / 250
  await page.getByLabel("Amount you save each month").fill("500");
  await expect(card).toContainText("9 months"); // 4,500 / 500
  await expect(card).not.toContainText("18 months");
});

// Loan math for the three loan tools: payment = P*r / (1 - (1+r)^-n), r = rate/12, rounded half up to the cent.
// Each month's interest is rounded to the cent and the last payment is trued up, so total paid is not payment x n.
// Worked in Python Fractions: 10,000 at 6% for 36 months -> 304.22, total 10,951.88; 12,000 at 6.5% for 36 -> 367.79, 13,240.36.
test("loan-explainer: new numbers give the new payment and total", async ({ page }) => {
  await open(page, "loan-explainer");
  await page.getByLabel("Amount borrowed").fill("10000");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("How long is the loan?").fill("36");
  const card = page.getByLabel("Monthly payment");
  await expect(card).toContainText("$304.22");
  await expect(card).toContainText("$10,951.88");
  await page.getByLabel("Amount borrowed").fill("12000");
  await page.getByLabel("Yearly interest rate").fill("6.5");
  await expect(card).toContainText("$367.79");
  await expect(card).toContainText("$13,240.36");
  await expect(card).not.toContainText("$304.22");
  await expect(card).not.toContainText("$10,951.88");
});

test("loan-offer-compare: changing offer 1 gives its new payment and total", async ({ page }) => {
  await open(page, "loan-offer-compare");
  await page.getByLabel("Offer 1: Amount borrowed").fill("10000");
  await page.getByLabel("Offer 1: Yearly interest rate").fill("6");
  await page.getByLabel("Offer 1: How long is the loan?").fill("36");
  await page.getByLabel("Offer 2: Amount borrowed").fill("10000");
  await page.getByLabel("Offer 2: Yearly interest rate").fill("5");
  await page.getByLabel("Offer 2: How long is the loan?").fill("48");
  const one = page.getByLabel("Offer 1, monthly payment");
  await expect(one).toContainText("$304.22"); // same worked numbers as above
  await expect(one).toContainText("$10,951.88");
  await page.getByLabel("Offer 1: Amount borrowed").fill("12000");
  await page.getByLabel("Offer 1: Yearly interest rate").fill("6.5");
  await expect(one).toContainText("$367.79");
  await expect(one).toContainText("$13,240.36");
  await expect(one).toContainText("$1,240.36"); // 13,240.36 - 12,000.00
  await expect(one).not.toContainText("$304.22");
  await expect(one).not.toContainText("$10,951.88");
});

// Student loan: interest is rounded to the cent each month (principal x rate / 12), unpaid interest piles up while
// there are no payments, then each payment covers unpaid interest first. Python Fractions, 20,000 and a 300 payment
// from 2026-09: at 5% -> 20,499.98 and 81 payments; at 6% -> 6 x 100.00 = 600.00 unpaid, 20,600.00, 85 payments,
// 528,883 cents (5,288.83) of interest, last payment in September 2033.
test("student-loan-growth-and-payoff: a new rate gives the new balance and payoff", async ({ page }) => {
  await open(page, "student-loan-growth-and-payoff");
  await page.getByLabel("Loan balance").fill("20000");
  await page.getByLabel("Yearly interest rate").fill("5");
  await page.getByLabel(/Months with no payments/).fill("6");
  await page.getByLabel("Monthly payment").fill("300");
  await page.getByLabel(/First payment month/).fill("2026-09");
  const card = page.getByRole("region", { name: "Balance when payments start", exact: true });
  await expect(card).toContainText("$20,499.98");
  await expect(card).toContainText("May 2033");
  await page.getByLabel("Yearly interest rate").fill("6");
  await expect(card).toContainText("$20,600.00");
  await expect(card).toContainText("85");
  await expect(card).toContainText("$5,288.83");
  await expect(card).toContainText("September 2033");
  await expect(card).not.toContainText("$20,499.98");
  await expect(card).not.toContainText("May 2033");
});

// Debt payoff: each month's interest is rounded to the cent, minimums are paid, the rest of the fixed monthly total
// (all minimums + extra) goes to the first open debt in line. Python Decimal-style loop; debts 800 at 3% (min 30) and
// 12,000 at 27.99% (min 300). Extra 200 -> snowball 36 months, 6,162.19; avalanche 5,800.94; gap 361.25.
// Extra 300 -> snowball 28 months, 4,695.76; avalanche 28 months, 4,379.99; gap 315.77.
test("debt-payoff-planner: a new extra amount gives new months and interest", async ({ page }) => {
  await open(page, "debt-payoff-planner");
  await page.getByLabel("Debt 1 balance").fill("800");
  await page.getByLabel("Debt 1 yearly interest rate").fill("3");
  await page.getByLabel("Debt 1 smallest monthly payment").fill("30");
  await page.getByLabel("Debt 2 balance").fill("12000");
  await page.getByLabel("Debt 2 yearly interest rate").fill("27.99");
  await page.getByLabel("Debt 2 smallest monthly payment").fill("300");
  await page.getByLabel("Extra each month").fill("200");
  const snow = page.getByRole("region", { name: "Snowball plan" });
  const aval = page.getByRole("region", { name: "Avalanche plan" });
  await expect(snow).toContainText("$6,162.19");
  await expect(aval).toContainText("$5,800.94");
  await expect(page.getByLabel("How the two payoff orders compare")).toContainText("$361.25");
  await page.getByLabel("Extra each month").fill("300");
  await expect(snow).toContainText("28 months");
  await expect(snow).toContainText("$4,695.76");
  await expect(aval).toContainText("$4,379.99");
  await expect(page.getByLabel("How the two payoff orders compare")).toContainText("$315.77");
  await expect(snow).not.toContainText("$6,162.19");
  await expect(aval).not.toContainText("$5,800.94");
  await expect(page.getByLabel("How the two payoff orders compare")).not.toContainText("$361.25");
});
