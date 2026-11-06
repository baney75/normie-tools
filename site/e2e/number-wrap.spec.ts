import { expect, test, type Page } from "@playwright/test";
import { nextButton } from "./answer-first";

// A result number must stay on one line, even on the narrowest phone in the matrix (iPhone SE).
test.use({ viewport: { width: 375, height: 667 } });

// Each tool is a list of steps; each step is a list of boxes to fill. Continue is tapped after every step (on the last, it is the tool's own button).
type Step = [string, string][];

async function fill(page: Page, id: string, steps: Step[]) {
  await page.goto(`#/tools/${id}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  for (const boxes of steps) {
    for (const [label, value] of boxes) {
      // "@check" picks a chip (length, category, Months or Years). Anything else is a box to fill.
      if (label === "@check") await page.getByLabel(value, { exact: true }).check();
      else await page.getByLabel(label).fill(value);
    }
    await nextButton(page).click();
  }
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

// Numbers that used to break, like $357,125.1 over 2, on the pages that print many money lines.
const CASES: { id: string; steps: Step[] }[] = [
  { id: "mortgage-payment-explainer", steps: [[["Home price", "1250000"]], [["Down payment", "125000"]], [["Yearly interest rate", "6.75"]], [["@check", "Other"], ["Years to pay it back", "30"]]] },
  { id: "student-loan-growth-and-payoff", steps: [[["Loan balance", "58250"]], [["Yearly interest rate", "6.54"]], [["Monthly payment (optional)", "712.32"]]] },
  { id: "loan-explainer", steps: [[["Amount borrowed", "357125.12"]], [["Yearly interest rate", "6.5"]], [["@check", "Other"], ["Length of the loan", "360"], ["@check", "Months"]]] },
  {
    id: "monthly-budget",
    steps: [
      [["Pay, per month", "15432.10"]],
      [["Rent or mortgage, per month", "3200.55"], ["Food, per month", "1450.25"], ["Bills, per month", "900.75"], ["Transport, per month", "650"], ["Other, per month", "99999.99"]],
    ],
  },
  {
    id: "loan-offer-compare",
    steps: [
      [["Offer 1: Amount borrowed", "357125.12"], ["Offer 1: Yearly interest rate", "6.5"]],
      [["Offer 1: How long is the loan?", "30"], ["Offer 1: Upfront fees", "4500"]],
      [["Offer 2: Amount borrowed", "357125.12"], ["Offer 2: Yearly interest rate", "5.9"]],
      [["Offer 2: How long is the loan?", "15"], ["Offer 2: Upfront fees", "12000"]],
    ],
  },
  { id: "unit-converter", steps: [[["@check", "Length"]], [["Number", "1234567.89"]]] },
];

for (const c of CASES) {
  test(`${c.id}: every result number is one line at 375px`, async ({ page }) => {
    await fill(page, c.id, c.steps);
    await expect(page.locator(".nt-result-answer").first()).toBeVisible();
    // The long lists of numbers wait inside "See all the numbers". Open them so they are measured too.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
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
