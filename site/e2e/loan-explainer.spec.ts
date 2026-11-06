import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import {
  changeNumbers, continueToAnswer, expectAnsweredButtons, expectBlockedUntilReady, expectFirstStepWaiting, expectNoSidewaysScroll,
  expectOnStep, expectStepTargets, expectTrustLine, next, nextButton, openMoreOptions, reopenStep, seedSaved,
  expectResumeScreen, expectNoSavedCopy, expectOnAnswer,
} from "./answer-first";
import { addLoanExtras, LOAN_SEE, openFresh, pickLoanTerm, walkLoan } from "./walk";

// The golden answers come from tools/loan-explainer/tests/golden.json (worked out apart from the code).
// The tool is three questions, one per screen: How much, What rate, How long. Then the answer screen.
test.use({ viewport: { width: 390, height: 844 } });

const ID = "loan-explainer";
const QUESTION = "What will my loan cost?";
const WAITING = "Type your numbers to see your monthly payment.";
const card = (page: import("@playwright/test").Page) => page.getByLabel("Monthly payment");

test.beforeEach(async ({ page }) => {
  await openFresh(page, ID, "Amount borrowed");
});

test("opens on step 1 with an empty box, and Continue is the one main button that leads to the box", async ({ page }) => {
  await expectFirstStepWaiting(page, { total: 3, question: "How much did you borrow?", firstBox: "Amount borrowed", missing: "Type the amount you borrowed first." });
  await expect(page.getByText("Loan Explainer", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await expect(page.getByText(/There is no Send button/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  // One question per screen: the other boxes are not here yet, and no answer card is.
  await expect(page.getByLabel("Yearly interest rate")).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("steps 2 and 3 open empty and wait for a rate and a length", async ({ page }) => {
  await page.getByLabel("Amount borrowed").fill("12,000");
  await next(page);
  await expectOnStep(page, 2, 3, "What is the yearly interest rate?");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await expect(page.getByRole("link", { name: "Back to tools" })).toHaveCount(0);
  await expectBlockedUntilReady(page, "Type the rate first. Type 0 if there is none.", "Yearly interest rate");
  await page.getByLabel("Yearly interest rate").fill("6.5");
  await next(page);
  await expectOnStep(page, 3, 3, "How long is the loan?");
  for (const years of ["2 years", "3 years", "4 years", "5 years", "Other"]) {
    await expect(page.getByLabel(years, { exact: true })).not.toBeChecked();
  }
  // The last step carries the tool's own words and is a form submit, so Enter works too.
  await expect(nextButton(page)).toHaveText(LOAN_SEE);
  await nextButton(page).click();
  await expect(page.locator(".nt-flow-missing")).toHaveText("Pick how long the loan is first.");
  await expectOnStep(page, 3, 3, "How long is the loan?");
  // Back goes to the step before, with what was typed still there.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expectOnStep(page, 2, 3, "What is the yearly interest rate?");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("6.5");
});

test("a saved copy that has no answer yet shows the waiting text on the answer screen", async ({ page }) => {
  await seedSaved(page, ID, 3, { amount: "", rate: "", term: "", termUnit: "months", fees: "", extra: "" });
  await page.reload();
  await expectResumeScreen(page, "Loan Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText(WAITING);
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});

test("with an answer, Done is the one filled button, Continue is gone, and Print or save opens the sheet", async ({ page }) => {
  await walkLoan(page, { amount: "12,000", rate: "6.5", term: "3", unit: "Years" });
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("$367.79");
  await expect(card(page)).toContainText("For $12,000 at 6.5% for 3 years.");
  await expectOnAnswer(page, 3);
  await expect(nextButton(page)).toHaveCount(0);
  await expectAnsweredButtons(page, LOAN_SEE);
});

test("Start over, Clear the boxes empties the boxes, stays on the answer screen, and Change my numbers opens step 1 blank", async ({ page }) => {
  await walkLoan(page, { amount: "10,000", rate: "6", term: "36" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  // Clearing stays on the answer screen, so Put it back is right here. Change my numbers goes to step 1.
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await expect(card(page)).toContainText(WAITING);
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await changeNumbers(page, 3);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await page.getByLabel("Amount borrowed").fill("1");
  await next(page);
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await page.getByLabel("Yearly interest rate").fill("1");
  await next(page);
  // The length is cleared too: no chip is picked, "Other" is closed again, and its box and the Months/Years chips are gone.
  for (const years of ["2 years", "3 years", "4 years", "5 years", "Other"]) {
    await expect(page.getByLabel(years, { exact: true })).not.toBeChecked();
  }
  await expect(page.getByLabel("Length of the loan")).toHaveCount(0);
  await expect(page.getByLabel("Months", { exact: true })).toHaveCount(0);
});

test("gives the exact monthly payment, total paid and interest, with no sideways scroll", async ({ page }) => {
  await walkLoan(page, { amount: "$10,000", rate: "6", term: "36" });
  await expect(card(page)).toContainText("$304.22");
  // The one filled element is Done. Print or save opens Print and Save a copy in place.
  await expect(page.locator(".primary")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "I'm done", exact: true })).toHaveClass(/primary/);
  await page.getByRole("button", { name: "Print or save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a copy" })).toBeVisible();
  await expect(card(page)).toContainText("$10,951.88");
  await expect(card(page)).toContainText("$951.88");
  await expectNoSidewaysScroll(page);
  await page.screenshot({ path: shotPath("loan-explainer-phone.png"), fullPage: true });
});

// Both answers are worked out apart from the page: a payment rounded to the cent, then a month by month
// schedule where the last payment clears what is left (Python Decimal, round half up).
test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await walkLoan(page, { amount: "10000", rate: "6", term: "36" });
  await expect(card(page)).toContainText("$304.22");
  await expect(card(page)).toContainText("$10,951.88");
  await changeNumbers(page, 3);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("10000");
  await page.getByLabel("Amount borrowed").fill("12000");
  await next(page);
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("6");
  await page.getByLabel("Yearly interest rate").fill("6.5");
  await continueToAnswer(page);
  await expect(card(page)).toContainText("$367.79");
  await expect(card(page)).toContainText("$13,240.36");
  await expect(card(page)).not.toContainText("$304.22");
});

test("extra payment shows months and interest saved, and the by-year table opens", async ({ page }) => {
  await walkLoan(page, { amount: "20,000", rate: "7.25", term: "5", unit: "Years" });
  await addLoanExtras(page, { fees: "$500", extra: "$100" });
  // One schedule everywhere: the card and "See all the numbers" both follow the extra payment.
  await expect(card(page)).toContainText("$498.39");
  await expect(card(page)).toContainText("Paid off in47 months");
  await page.getByText("See all the numbers").click();
  const all = page.getByLabel("See all the numbers");
  await expect(all).toContainText("Payment without the extra$398.39");
  await expect(all).toContainText("Loan length47 months");
  await expect(all).toContainText("Cost of borrowing$3,474.16");
  const extra = page.getByRole("region", { name: "With your extra payment" });
  await expect(extra).toContainText("47 months");
  await expect(extra).toContainText("13");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(5);
  await expectNoSidewaysScroll(page);
});

test("messy typing shows a calm error that names the field, and Continue waits", async ({ page }) => {
  await page.getByLabel("Amount borrowed").fill("lots of money");
  await expect(page.getByText("Amount borrowed: use a number above zero")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await nextButton(page).click();
  await expectOnStep(page, 1, 3, "How much did you borrow?");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Type the amount you borrowed first.");
  await page.getByLabel("Amount borrowed").fill("1e3");
  await expect(page.getByText("Amount borrowed: use a number above zero")).toBeVisible();
  await page.getByLabel("Amount borrowed").fill(" 1,000.50 ");
  await expect(page.getByText("Amount borrowed: use a number above zero")).toHaveCount(0);
  await next(page);
  await expectOnStep(page, 2, 3, "What is the yearly interest rate?");
});

test("tap targets are 44px or more and text is 16px or more, on every step", async ({ page }) => {
  // Step 1: the amount box. Step 2: the rate box. Step 3: the chips, plus Other's box and the Months/Years chips.
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Amount borrowed").fill("1000");
  await next(page);
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Yearly interest rate").fill("5");
  await next(page);
  // Five length chips.
  expect(await expectStepTargets(page)).toBe(5);
  await page.getByLabel("Other", { exact: true }).check();
  // Five length chips, the length box, and the Months and Years chips.
  expect(await expectStepTargets(page)).toBe(8);
  await page.getByLabel("Length of the loan").fill("12");
  await page.getByLabel("Months", { exact: true }).check();
  await next(page, LOAN_SEE);
  // The answer screen: open the optional boxes so they are measured too.
  await addLoanExtras(page, {});
  expect(await expectStepTargets(page, ".nt-field-input")).toBe(2);
  await expectNoSidewaysScroll(page);
});

test("the optional boxes wait inside the closed More options on the answer screen, and it opens by itself for a red note", async ({ page }) => {
  await walkLoan(page, { amount: "1200", rate: "0", term: "12" });
  await expect(page.getByRole("button", { name: "Add fees or extra payments, if you have them" })).toHaveCount(0);
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByLabel("Upfront fees")).toBeHidden();
  await expect(page.getByLabel("Extra each month")).toBeHidden();
  await expect(page.locator(".nt-flow-answer .nt-field-input:visible")).toHaveCount(0);
  await addLoanExtras(page, {});
  await expect(page.getByLabel("Upfront fees")).toBeVisible();
  await expect(page.getByLabel("Extra each month")).toBeVisible();
  await page.getByLabel("Upfront fees").fill("$300");
  await page.reload();
  await expectResumeScreen(page, "Loan Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByLabel("Upfront fees")).toHaveValue("$300");
  // A bad value opens More options by itself, with the red note showing.
  await openMoreOptions(page);
  await page.getByLabel("Upfront fees").fill("abc");
  await page.reload();
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", true);
  await expect(page.getByLabel("Upfront fees")).toBeVisible();
  await expect(page.getByLabel("Upfront fees")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("details.nt-more .nt-errnote")).toBeVisible();
});

test("No thanks hides the prompt and leaves the boxes blank, and Use them brings the saved numbers back", async ({ page }) => {
  await walkLoan(page, { amount: "1200", rate: "0", term: "12" });
  await expect(card(page)).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-explainer");
  // A saved copy with blank boxes opens a screen of its own, in place of step 1.
  await expectResumeScreen(page, "Loan Explainer");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expectNoSavedCopy(page);
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("numbers come back after leaving, on the same screen", async ({ page }) => {
  await walkLoan(page, { amount: "1200", rate: "0", term: "12" });
  await expect(card(page)).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-explainer");
  await expectResumeScreen(page, "Loan Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  // The step is kept with the numbers, so the answer screen is back.
  await expect(card(page)).toContainText("$100.00");
  await reopenStep(page, 1, 3);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
  await next(page);
  await next(page);
  await expect(page.getByLabel("Length of the loan")).toHaveValue("12");
});

test("leaving in the middle of the steps brings the person back to that step", async ({ page }) => {
  await page.getByLabel("Amount borrowed").fill("1200");
  await next(page);
  await page.getByLabel("Yearly interest rate").fill("4");
  await next(page);
  await page.goto("about:blank");
  await page.goto("#/tools/loan-explainer");
  await expectResumeScreen(page, "Loan Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expectOnStep(page, 3, 3, "How long is the loan?");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("4");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await walkLoan(page, { amount: "200,000", rate: "6.5", term: "30", unit: "Years" });
  await expect(card(page)).toContainText("$1,264.14");
  await page.screenshot({ path: shotPath("loan-explainer-desktop.png"), fullPage: true });
});

test("Start over asks first, and Keep my numbers leaves the answer as it was", async ({ page }) => {
  await walkLoan(page, { amount: "1200", rate: "0", term: "12" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Keep my numbers" }).click();
  await expect(card(page)).toContainText("$100.00");
  await reopenStep(page, 1, 3);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
});

test("Start over, then Put it back brings the numbers and the answer back", async ({ page }) => {
  await walkLoan(page, { amount: "1200", rate: "0", term: "12" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await page.getByRole("button", { name: "Put it back", exact: true }).click();
  await expect(page.getByText(/Your numbers are cleared\./)).toHaveCount(0);
  await expect(card(page)).toContainText("$100.00");
  await changeNumbers(page, 3);
  await expect(page.getByLabel("Amount borrowed")).toHaveValue("1200");
});
