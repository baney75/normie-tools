import { expect, type Page } from "@playwright/test";
import { next, openMoreOptions } from "./answer-first";

// Walk each calculator the way a person does: fill the step, tap Continue, and on the last step tap the tool's own button.
// Every walker starts on step 1 of a tool with empty boxes and ends on the answer screen.

export const LOAN_SEE = "See my payment";
export const MORTGAGE_SEE = "See my payment";
export const STUDENT_SEE = "See my answer";
export const OFFERS_SEE = "See which costs less";
export const BUDGET_SEE = "See what is left over";
export const UNIT_SEE = "See my answer";

/** Open a tool with nothing saved, on step 1. */
export async function openFresh(page: Page, id: string, firstBox: string) {
  await page.goto(`#/tools/${id}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel(firstBox).first()).toBeVisible();
}

// Loan Explainer ---------------------------------------------------------------------------------

export type LoanValues = { amount: string; rate: string; term: string; unit?: "Months" | "Years" };

/** The length step: a chip for 2 to 5 years, or Other with a number box and Months/Years chips. */
export async function pickLoanTerm(page: Page, v: Pick<LoanValues, "term" | "unit">) {
  if (v.unit === "Years" && ["2", "3", "4", "5"].includes(v.term)) {
    await page.getByLabel(`${v.term} years`, { exact: true }).check();
  } else {
    await page.getByLabel("Other", { exact: true }).check();
    await page.getByLabel("Length of the loan").fill(v.term);
    await page.getByLabel(v.unit ?? "Months", { exact: true }).check();
  }
}

export async function walkLoan(page: Page, v: LoanValues) {
  await page.getByLabel("Amount borrowed", { exact: true }).fill(v.amount);
  await next(page);
  await page.getByLabel("Yearly interest rate", { exact: true }).fill(v.rate);
  await next(page);
  await pickLoanTerm(page, v);
  await next(page, LOAN_SEE);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

/** On the answer screen: open "More options" and fill the fees and extra boxes. */
export async function addLoanExtras(page: Page, v: { fees?: string; extra?: string }) {
  await openMoreOptions(page);
  if (v.fees !== undefined) await page.getByLabel("Upfront fees").fill(v.fees);
  if (v.extra !== undefined) await page.getByLabel("Extra each month").fill(v.extra);
}

// Mortgage Payment Explainer -----------------------------------------------------------------------

export type MortgageValues = { price: string; down: string; rate: string; term: string };

export async function pickMortgageTerm(page: Page, term: string) {
  if (["15", "20", "30"].includes(term)) {
    await page.getByLabel(`${term} years`, { exact: true }).check();
  } else {
    await page.getByLabel("Other", { exact: true }).check();
    await page.getByLabel("Years to pay it back").fill(term);
  }
}

export async function walkMortgage(page: Page, v: MortgageValues) {
  await page.getByLabel("Home price", { exact: true }).fill(v.price);
  await next(page);
  await page.getByLabel("Down payment", { exact: true }).fill(v.down);
  await next(page);
  await page.getByLabel("Yearly interest rate", { exact: true }).fill(v.rate);
  await next(page);
  await pickMortgageTerm(page, v.term);
  await next(page, MORTGAGE_SEE);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

/** On the answer screen: open "More options" and fill the tax, insurance and fee boxes given. */
export async function addMortgageExtras(page: Page, v: { tax?: string; insurance?: string; hoa?: string; pmi?: string }) {
  await openMoreOptions(page);
  if (v.tax !== undefined) await page.getByLabel("Property tax for the year").fill(v.tax);
  if (v.insurance !== undefined) await page.getByLabel("Home insurance for the year").fill(v.insurance);
  if (v.hoa !== undefined) await page.getByLabel("Neighborhood fee each month").fill(v.hoa);
  if (v.pmi !== undefined) await page.getByLabel("Mortgage insurance each month").fill(v.pmi);
}

// Student Loan Growth and Payoff ------------------------------------------------------------------

export type StudentValues = { balance: string; rate: string; payment?: string };

export async function walkStudent(page: Page, v: StudentValues) {
  await page.getByLabel("Loan balance", { exact: true }).fill(v.balance);
  await next(page);
  await page.getByLabel("Yearly interest rate", { exact: true }).fill(v.rate);
  await next(page);
  if (v.payment !== undefined) await page.getByLabel("Monthly payment").fill(v.payment);
  await next(page, STUDENT_SEE);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

/** On the answer screen: open "More options" and fill the school months and other details given. */
export async function addStudentDetails(page: Page, v: { wait?: string; start?: string; years?: string; capitalize?: boolean }) {
  await openMoreOptions(page);
  if (v.wait !== undefined) await page.getByLabel(/Months with no payments/).fill(v.wait);
  if (v.start !== undefined) await page.getByLabel(/First payment month/).fill(v.start);
  if (v.years !== undefined) await page.getByLabel(/Years you want/).fill(v.years);
  if (v.capitalize) await page.getByLabel(/Add the unpaid interest/).check();
}

// Loan Offer Compare ------------------------------------------------------------------------------

export type OfferValues = { amount: string; rate: string; term: string; unit?: "Months" | "Years"; fees?: string };

/** The two steps of one offer. `last` is true when its second step is the tool's last step. */
export async function walkOffer(page: Page, n: number, v: OfferValues, last: boolean) {
  await page.getByLabel(`Offer ${n}: Amount borrowed`).fill(v.amount);
  await page.getByLabel(`Offer ${n}: Yearly interest rate`).fill(v.rate);
  await next(page);
  await page.getByLabel(`Offer ${n}: How long is the loan?`).fill(v.term);
  await page.getByRole("group", { name: `Offer ${n}`, exact: true }).getByLabel(v.unit ?? "Months", { exact: true }).check();
  // Fees are optional: empty means none.
  await page.getByLabel(`Offer ${n}: Upfront fees`).fill(v.fees ?? "");
  if (last) await next(page, OFFERS_SEE);
  else await next(page);
}

export async function walkOffers(page: Page, offers: [OfferValues, OfferValues] | [OfferValues, OfferValues, OfferValues]) {
  await walkOffer(page, 1, offers[0], false);
  await walkOffer(page, 2, offers[1], true);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
  if (offers[2]) await addThirdOffer(page, offers[2]);
}

/** On the answer screen: "Add a third offer" opens steps 5 and 6. Walk them. */
export async function addThirdOffer(page: Page, v: OfferValues) {
  await page.getByRole("button", { name: "Add a third offer" }).click();
  await expect(page.locator(".nt-flow-count")).toHaveText("Step 5 of 7");
  await walkOffer(page, 3, v, true);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

// Monthly Budget ----------------------------------------------------------------------------------

export type BudgetValues = { pay: string; spend?: Partial<Record<"Rent or mortgage" | "Food" | "Bills" | "Transport" | "Other", string>> };

export async function walkBudget(page: Page, v: BudgetValues) {
  await page.getByLabel("Pay, per month", { exact: true }).fill(v.pay);
  await next(page);
  for (const [line, amount] of Object.entries(v.spend ?? {})) {
    await page.getByLabel(`${line}, per month`, { exact: true }).fill(amount);
  }
  await next(page, BUDGET_SEE);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

// Unit Converter ----------------------------------------------------------------------------------

export type UnitValues = { kind: string; value: string; from?: string; to?: string };

export async function walkUnit(page: Page, v: UnitValues) {
  await page.getByLabel(v.kind, { exact: true }).check();
  await next(page);
  await page.getByLabel("Number", { exact: true }).fill(v.value);
  if (v.from) await page.getByLabel("From", { exact: true }).selectOption(v.from);
  if (v.to) await page.getByLabel("To", { exact: true }).selectOption(v.to);
  await next(page, UNIT_SEE);
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

// Tours -------------------------------------------------------------------------------------------
// Walk one tool with real values and stop at every screen so a check can look at it. `look` runs on each question step before
// it is filled, again after it is filled, and once on the answer screen (named "answer").

export type Look = (screen: string) => Promise<void>;
export type Tour = { id: string; name: string; firstBox: string; steps: number; run: (page: Page, look: Look) => Promise<void> };

async function stepLook(page: Page, look: Look, n: number, fill: () => Promise<void>, button = "Continue") {
  await look(`step ${n}`);
  await fill();
  await look(`step ${n} filled`);
  await next(page, button);
}

export const TOURS: Tour[] = [
  {
    id: "loan-explainer", name: "Loan Explainer", firstBox: "Amount borrowed", steps: 3,
    run: async (page, look) => {
      await stepLook(page, look, 1, () => page.getByLabel("Amount borrowed", { exact: true }).fill("12000"));
      await stepLook(page, look, 2, () => page.getByLabel("Yearly interest rate", { exact: true }).fill("6.5"));
      await stepLook(page, look, 3, () => page.getByLabel("3 years", { exact: true }).check(), LOAN_SEE);
      await look("answer");
    },
  },
  {
    id: "mortgage-payment-explainer", name: "Mortgage Payment Explainer", firstBox: "Home price", steps: 4,
    run: async (page, look) => {
      await stepLook(page, look, 1, () => page.getByLabel("Home price", { exact: true }).fill("300000"));
      await stepLook(page, look, 2, () => page.getByLabel("Down payment", { exact: true }).fill("60000"));
      await stepLook(page, look, 3, () => page.getByLabel("Yearly interest rate", { exact: true }).fill("6.5"));
      await stepLook(page, look, 4, () => page.getByLabel("30 years", { exact: true }).check(), MORTGAGE_SEE);
      await look("answer");
    },
  },
  {
    id: "student-loan-growth-and-payoff", name: "Student Loan Growth and Payoff", firstBox: "Loan balance", steps: 3,
    run: async (page, look) => {
      await stepLook(page, look, 1, () => page.getByLabel("Loan balance", { exact: true }).fill("20000"));
      await stepLook(page, look, 2, () => page.getByLabel("Yearly interest rate", { exact: true }).fill("5"));
      await stepLook(page, look, 3, () => page.getByLabel("Monthly payment").fill("300"), STUDENT_SEE);
      await look("answer");
    },
  },
  {
    id: "loan-offer-compare", name: "Loan Offer Compare", firstBox: "Offer 1: Amount borrowed", steps: 4,
    run: async (page, look) => {
      const offers = [
        { amount: "12000", rate: "7.5", term: "36", fees: "0" },
        { amount: "12000", rate: "6.9", term: "36", fees: "400" },
      ];
      for (const [i, o] of offers.entries()) {
        const n = i + 1;
        await stepLook(page, look, n * 2 - 1, async () => {
          await page.getByLabel(`Offer ${n}: Amount borrowed`).fill(o.amount);
          await page.getByLabel(`Offer ${n}: Yearly interest rate`).fill(o.rate);
        });
        await stepLook(
          page,
          look,
          n * 2,
          async () => {
            await page.getByLabel(`Offer ${n}: How long is the loan?`).fill(o.term);
            await page.getByRole("group", { name: `Offer ${n}`, exact: true }).getByLabel("Months", { exact: true }).check();
            await page.getByLabel(`Offer ${n}: Upfront fees`).fill(o.fees);
          },
          n === 2 ? OFFERS_SEE : "Continue",
        );
      }
      await look("answer");
    },
  },
  {
    id: "monthly-budget", name: "Monthly Budget", firstBox: "Pay, per month", steps: 2,
    run: async (page, look) => {
      await stepLook(page, look, 1, () => page.getByLabel("Pay, per month", { exact: true }).fill("3200"));
      await stepLook(
        page,
        look,
        2,
        async () => {
          const spend = { "Rent or mortgage": "1200", Food: "500", Bills: "300", Transport: "250", Other: "150" };
          for (const [line, amount] of Object.entries(spend)) await page.getByLabel(`${line}, per month`, { exact: true }).fill(amount);
        },
        BUDGET_SEE,
      );
      await look("answer");
    },
  },
  {
    id: "unit-converter", name: "Unit Converter", firstBox: "Length", steps: 2,
    run: async (page, look) => {
      await stepLook(page, look, 1, () => page.getByLabel("Length", { exact: true }).check());
      await stepLook(page, look, 2, () => page.getByLabel("Number", { exact: true }).fill("12"), UNIT_SEE);
      await look("answer");
    },
  },
];
