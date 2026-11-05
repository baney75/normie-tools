import { expect, test, type Page } from "@playwright/test";

// Type one set of numbers, then change them in the same visit. The answer must follow to a new answer that
// was worked out apart from the page (Python Decimal, round half up; see each note), never stay stale.
test.use({ viewport: { width: 390, height: 844 } });

async function open(page: Page, id: string) {
  await page.goto(`#/tools/${id}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("mortgage-payment-explainer: a new rate gives the new loan payment", async ({ page }) => {
  await open(page, "mortgage-payment-explainer");
  await page.getByLabel("Home price").fill("300000");
  await page.getByLabel("Down payment").fill("60000");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("30 years").check();
  // The loan payment alone is one of the parts inside "See all the numbers".
  await page.getByText("See all the numbers", { exact: true }).click();
  const all = page.locator("details").filter({ has: page.getByText("See all the numbers", { exact: true }) });
  await expect(all).toContainText("$1,438.92"); // 240,000 at 6% for 360 months
  // With no tax, insurance or fees, the total on the card is the loan payment.
  const card = page.getByLabel("Total monthly payment");
  await expect(card).toContainText("$1,438.92");
  await page.getByLabel("Yearly interest rate").fill("7");
  await expect(card).toContainText("$1,596.73"); // 240,000 at 7% for 360 months
  await expect(all).toContainText("$1,596.73");
  await expect(card).not.toContainText("$1,438.92");
  await expect(all).not.toContainText("$1,438.92");
});

test("monthly-budget: a new rent gives the new amount left over", async ({ page }) => {
  await open(page, "monthly-budget");
  await page.getByLabel("Pay, per month").fill("3000");
  await page.getByLabel("Rent or mortgage, per month").fill("1200");
  const card = page.getByLabel("Left over each month", { exact: true });
  await expect(card).toContainText("$1,800.00"); // 3,000.00 - 1,200.00
  await page.getByLabel("Rent or mortgage, per month").fill("1500");
  await expect(card).toContainText("$1,500.00"); // 3,000.00 - 1,500.00
  await expect(card).not.toContainText("$1,800.00");
});

test("unit-converter: a new number gives the new converted number", async ({ page }) => {
  await open(page, "unit-converter");
  await page.getByLabel("Length", { exact: true }).check();
  await page.getByLabel("Number").fill("12");
  const card = page.getByLabel("Your answer", { exact: true });
  await expect(card).toContainText("304.8 millimeters"); // 12 x 25.4
  await page.getByLabel("Number").fill("24");
  await expect(card).toContainText("609.6 millimeters"); // 24 x 25.4
});

// Loan math for the three loan tools: payment = P*r / (1 - (1+r)^-n), r = rate/12, rounded half up to the cent.
// Each month's interest is rounded to the cent and the last payment is trued up, so total paid is not payment x n.
// Worked in Python Fractions: 10,000 at 6% for 36 months -> 304.22, total 10,951.88; 12,000 at 6.5% for 36 -> 367.79, 13,240.36.
test("loan-explainer: new numbers give the new payment and total", async ({ page }) => {
  await open(page, "loan-explainer");
  await page.getByLabel("Amount borrowed").fill("10000");
  await page.getByLabel("Yearly interest rate").fill("6");
  await page.getByLabel("Other", { exact: true }).check();
  await page.getByLabel("Length of the loan").fill("36");
  await page.getByLabel("Months", { exact: true }).check();
  const card = page.getByLabel("Monthly payment");
  await expect(card).toContainText("$304.22");
  await expect(card).toContainText("$10,951.88"); // "You pay back ... in all."
  await page.getByLabel("Amount borrowed").fill("12000");
  await page.getByLabel("Yearly interest rate").fill("6.5");
  await expect(card).toContainText("$367.79");
  await expect(card).toContainText("$13,240.36");
  await expect(card).not.toContainText("$304.22");
  await expect(card).not.toContainText("$10,951.88");
});

test("loan-offer-compare: changing offer 1 gives its new payment and total", async ({ page }) => {
  await open(page, "loan-offer-compare");
  const offer = async (n: number, amount: string, rate: string, term: string) => {
    await page.getByLabel(`Offer ${n}: Amount borrowed`).fill(amount);
    await page.getByLabel(`Offer ${n}: Yearly interest rate`).fill(rate);
    await page.getByLabel(`Offer ${n}: How long is the loan?`).fill(term);
    await page.getByRole("group", { name: `Offer ${n}`, exact: true }).getByLabel("Months", { exact: true }).check();
    await page.getByLabel(`Offer ${n}: Upfront fees`).fill("");
  };
  await offer(1, "10000", "6", "36");
  await offer(2, "10000", "5", "48");
  // The card holds each offer's monthly payment; totals are in the table under "See all the numbers".
  const card = page.getByLabel("Cheaper overall");
  await expect(card).toContainText("$304.22"); // same worked numbers as above
  await page.getByText("See all the numbers", { exact: true }).click();
  const all = page.locator("details").filter({ has: page.getByText("See all the numbers", { exact: true }) });
  const row = (name: string) => all.getByRole("row", { name: new RegExp(`^${name}`) });
  await expect(row("Total paid")).toContainText("$10,951.88");
  await page.getByLabel("Offer 1: Amount borrowed").fill("12000");
  await page.getByLabel("Offer 1: Yearly interest rate").fill("6.5");
  await expect(card).toContainText("$367.79");
  await expect(row("Total paid")).toContainText("$13,240.36");
  await expect(row("Cost of borrowing")).toContainText("$1,240.36"); // 13,240.36 - 12,000.00
  await expect(card).not.toContainText("$304.22");
  await expect(row("Total paid")).not.toContainText("$10,951.88");
});

// Student loan: interest is rounded to the cent each month (principal x rate / 12), unpaid interest piles up while
// there are no payments, then each payment covers unpaid interest first. Python Fractions, 20,000 and a 300 payment
// from 2026-09: at 5% -> 20,499.98 and 81 payments; at 6% -> 6 x 100.00 = 600.00 unpaid, 20,600.00, 85 payments,
// 528,883 cents (5,288.83) of interest, last payment in September 2033.
test("student-loan-growth-and-payoff: a new rate gives the new balance and payoff", async ({ page }) => {
  await open(page, "student-loan-growth-and-payoff");
  await page.getByLabel("Loan balance").fill("20000");
  await page.getByLabel("Yearly interest rate").fill("5");
  await page.getByLabel("Monthly payment").fill("300");
  await page.getByRole("button", { name: "Add school months and other details" }).click();
  await page.getByLabel(/Months with no payments/).fill("6");
  await page.getByLabel(/First payment month/).fill("2026-09");
  // With a payment the card says when it is paid off; the balance and month count are in the details below.
  const card = page.getByRole("region", { name: "Paid off in", exact: true });
  await page.getByText("See year by year", { exact: true }).click();
  const all = page.locator("details").filter({ has: page.getByText("See year by year", { exact: true }) });
  await expect(all).toContainText("$20,499.98");
  await expect(all).toContainText("81");
  await expect(card).toContainText("May 2033");
  await page.getByLabel("Yearly interest rate").fill("6");
  await expect(all).toContainText("$20,600.00");
  await expect(all).toContainText("85");
  await expect(card).toContainText("$5,288.83");
  await expect(card).toContainText("September 2033");
  await expect(all).not.toContainText("$20,499.98");
  await expect(card).not.toContainText("May 2033");
});
