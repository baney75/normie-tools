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
