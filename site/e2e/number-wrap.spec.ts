import { expect, test, type Page } from "@playwright/test";

// A result number must stay on one line, even on the narrowest phone in the matrix (iPhone SE).
test.use({ viewport: { width: 375, height: 667 } });

async function fill(page: Page, id: string, boxes: [string, string][]) {
  await page.goto(`/#/tools/${id}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  for (const [label, value] of boxes) await page.getByLabel(label).fill(value);
}

// Numbers that used to break, like $357,125.1 over 2, on the pages that print many money lines.
const CASES: { id: string; boxes: [string, string][] }[] = [
  { id: "mortgage-payment-explainer", boxes: [["Home price", "1250000"], ["Down payment", "125000"], ["Yearly interest rate", "6.75"], ["Years to pay it back", "30"]] },
  { id: "student-loan-growth-and-payoff", boxes: [["Loan balance", "58250"], ["Yearly interest rate", "6.54"], ["Monthly payment (optional)", "712.32"]] },
  { id: "loan-explainer", boxes: [["Amount borrowed", "357125.12"], ["Yearly interest rate", "6.5"], ["How long is the loan?", "360"]] },
  { id: "debt-payoff-planner", boxes: [["Debt 1 balance", "24500.55"], ["Debt 1 yearly interest rate", "22.99"], ["Debt 1 minimum payment", "489.01"], ["Debt 2 balance", "5000"], ["Debt 2 yearly interest rate", "6.5"], ["Debt 2 minimum payment", "100"]] },
  { id: "monthly-budget", boxes: [["Pay, per month", "15432.10"], ["Rent or mortgage, per month", "3200.55"], ["Food, per month", "1450.25"], ["Bills, per month", "900.75"], ["Transport, per month", "650"], ["Other, per month", "99999.99"]] },
  { id: "loan-offer-compare", boxes: [["Offer 1: Amount borrowed", "357125.12"], ["Offer 1: Yearly interest rate", "6.5"], ["Offer 1: How long is the loan?", "30"], ["Offer 1: Upfront fees", "4500"], ["Offer 2: Amount borrowed", "357125.12"], ["Offer 2: Yearly interest rate", "5.9"], ["Offer 2: How long is the loan?", "15"], ["Offer 2: Upfront fees", "12000"]] },
  { id: "unit-converter", boxes: [["Number", "1234567.89"]] },
];

for (const c of CASES) {
  test(`${c.id}: every result number is one line at 375px`, async ({ page }) => {
    await fill(page, c.id, c.boxes);
    await expect(page.locator(".nt-result-answer").first()).toBeVisible();
    const broken = await page.evaluate(() => {
      const nodes = document.querySelectorAll<HTMLElement>('[class$="-lines"] dd, .nt-result-answer:not(.nt-result-answer-text), main table td:not(:first-child)');
      return [...nodes]
        .filter((n) => n.getBoundingClientRect().width > 0 && (n.textContent ?? "").trim() !== "")
        .filter((n) => {
          const r = document.createRange();
          r.selectNodeContents(n);
          return r.getClientRects().length > 1;
        })
        .map((n) => (n.textContent ?? "").trim());
    });
    expect(broken, "values that wrap onto a second line").toEqual([]);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(wide).toBe(false);
  });
}
