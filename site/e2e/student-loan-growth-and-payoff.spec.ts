import { expect, test, type Page } from "@playwright/test";
import { shotPath } from "./paths";
import {
  changeNumbers, continueToAnswer, expectAnsweredButtons, expectBlockedUntilReady, expectFirstStepWaiting, expectNoSidewaysScroll,
  expectOnStep, expectStepTargets, expectTrustLine, next, nextButton, openMoreOptions, reopenStep, seedSaved,
  expectResumeScreen, expectNoSavedCopy, expectOnAnswer,
} from "./answer-first";
import { addStudentDetails, openFresh, STUDENT_SEE, walkStudent } from "./walk";

// The golden answers come from tools/student-loan-growth-and-payoff/tests/golden.json (worked out apart from the code).
// The tool is three questions, one per screen: What you owe, the Rate, the Monthly payment (optional). Then the answer screen.
// School months, the unpaid-interest box, first payment month and years wait behind a button on the answer screen.
test.use({ viewport: { width: 390, height: 844 } });

const ID = "student-loan-growth-and-payoff";
const QUESTION = "When will my student loan be paid off?";

// With a payment the card is "Paid off in"; without one it is "Balance when payments start".
const paidCard = (page: Page) => page.getByRole("region", { name: "Paid off in", exact: true });
const balanceCard = (page: Page) => page.getByRole("region", { name: "Balance when payments start", exact: true });

async function fillGolden(page: Page) {
  await walkStudent(page, { balance: "$20,000", rate: "5", payment: "300" });
  await addStudentDetails(page, { wait: "6", start: "2026-09", years: "10" });
}

test.beforeEach(async ({ page }) => {
  await openFresh(page, ID, "Loan balance");
});

test("opens on step 1 with an empty box, and Continue is the one main button that leads to the box", async ({ page }) => {
  await expectFirstStepWaiting(page, { total: 3, question: "How much do you owe?", firstBox: "Loan balance", missing: "Type what you owe first." });
  await expect(page.getByText("Student Loan Growth and Payoff", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Loan balance")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expect(page.getByLabel("Yearly interest rate")).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("steps 2 and 3 open empty, the rate waits, and the payment may stay empty", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("20,000");
  await next(page);
  await expectOnStep(page, 2, 3, "What is the yearly interest rate?");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await expectBlockedUntilReady(page, "Type the rate first. Type 0 if there is none.", "Yearly interest rate");
  await page.getByLabel("Yearly interest rate").fill("5.5");
  await next(page);
  await expectOnStep(page, 3, 3, "How much do you pay each month?");
  await expect(page.getByLabel("Monthly payment")).toHaveValue("");
  await expect(nextButton(page)).toHaveText(STUDENT_SEE);
  // The payment is optional, so the last button goes straight on.
  await next(page, STUDENT_SEE);
  await expect(balanceCard(page)).toContainText("Balance when payments start");
});

test("a saved copy that has no answer yet shows the waiting text on the answer screen", async ({ page }) => {
  await seedSaved(page, ID, 3, { balance: "", rate: "", payment: "", waitMonths: "", capitalize: false, start: "", years: "" });
  await page.reload();
  await expectResumeScreen(page, "Student Loan Growth and Payoff");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(balanceCard(page)).toContainText("Type your numbers to see your answer.");
  await expect(balanceCard(page)).not.toContainText("Example");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});

test("with an answer, Done is the one filled button, Continue is gone, and Print or save opens the sheet", async ({ page }) => {
  await walkStudent(page, { balance: "20,000", rate: "5.5", payment: "250" });
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(paidCard(page)).toContainText(/\d+ years?(, \d+ months?)?/);
  await expect(paidCard(page)).toContainText("For $20,000 at 5.5%.");
  await expectOnAnswer(page, 3);
  await expect(nextButton(page)).toHaveCount(0);
  await expectAnsweredButtons(page, STUDENT_SEE);
});

test("without a payment the card shows the balance when payments start", async ({ page }) => {
  await walkStudent(page, { balance: "20,000", rate: "5.5" });
  await expect(paidCard(page)).toHaveCount(0);
  await expect(balanceCard(page)).toContainText("$20,000.00");
});

test("Start over, Clear the boxes empties the boxes, stays on the answer screen, and Change my numbers opens step 1 blank", async ({ page }) => {
  await walkStudent(page, { balance: "20,000", rate: "5", payment: "300" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  // Clearing stays on the answer screen, so Put it back is right here. Change my numbers goes to step 1.
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await expect(balanceCard(page)).toContainText("Type your numbers to see your answer.");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await changeNumbers(page, 3);
  await expect(page.getByLabel("Loan balance")).toHaveValue("");
  await page.getByLabel("Loan balance").fill("1");
  await next(page);
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await page.getByLabel("Yearly interest rate").fill("1");
  await next(page);
  await expect(page.getByLabel("Monthly payment")).toHaveValue("");
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
  await expectNoSidewaysScroll(page);
  await page.screenshot({ path: shotPath("student-loan-growth-and-payoff-phone.png"), fullPage: true });
});

test("the toggle adds the unpaid interest to the balance", async ({ page }) => {
  await fillGolden(page);
  await addStudentDetails(page, { capitalize: true });
  await expect(paidCard(page)).toContainText("$4,176.47");
  // The smallest payment now sits in the details below the card.
  await page.getByText("See year by year", { exact: true }).click();
  const all = page.locator("details").filter({ has: page.getByText("See year by year", { exact: true }) });
  await expect(all).toContainText("$217.44");
});

test("with a payment and no wait months the card shows Paying and Total interest, with no starting balance line", async ({ page }) => {
  await walkStudent(page, { balance: "20,000", rate: "5", payment: "300" });
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
  await expectNoSidewaysScroll(page);
});

test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await fillGolden(page);
  await expect(paidCard(page)).toContainText("May 2033");
  await reopenStep(page, 2, 3);
  await page.getByLabel("Yearly interest rate").fill("6");
  await continueToAnswer(page);
  await expect(paidCard(page)).toContainText("$5,288.83");
  await expect(paidCard(page)).toContainText("September 2033");
  await expect(paidCard(page)).not.toContainText("May 2033");
});

test("messy typing shows a calm error that names the field, and Continue waits", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("lots of money");
  await expect(page.getByText("Loan balance: use a number above zero")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await nextButton(page).click();
  await expectOnStep(page, 1, 3, "How much do you owe?");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Type what you owe first.");
  await page.getByLabel("Loan balance").fill("1e3");
  await expect(page.getByText("Loan balance: use a number above zero")).toBeVisible();
  await page.getByLabel("Loan balance").fill(" 1,000.50 ");
  await expect(page.getByText("Loan balance: use a number above zero")).toHaveCount(0);
  await next(page);
  await page.getByLabel("Yearly interest rate").fill("5");
  await next(page);
  await next(page, STUDENT_SEE);
  await expect(balanceCard(page)).toBeVisible();
  await addStudentDetails(page, { start: "9/2026" });
  await expect(page.getByText(/Payments start: type the year/)).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more, on every step", async ({ page }) => {
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Loan balance").fill("20000");
  await next(page);
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Yearly interest rate").fill("5");
  await next(page);
  expect(await expectStepTargets(page)).toBe(1);
  await next(page, STUDENT_SEE);
  // The answer screen: open the optional part so every box is measured.
  await addStudentDetails(page, {});
  // School months, first payment month, years.
  expect(await expectStepTargets(page, ".nt-field-input")).toBe(3);
  await expectNoSidewaysScroll(page);
});

test("the optional details wait inside the closed More options on the answer screen, and it opens by itself for a red note", async ({ page }) => {
  await walkStudent(page, { balance: "20000", rate: "5" });
  await expect(page.getByRole("button", { name: "Add school months and other details" })).toHaveCount(0);
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByLabel(/Months with no payments/)).toBeHidden();
  await expect(page.getByLabel(/Years you want/)).toBeHidden();
  await expect(page.locator(".nt-flow-answer .nt-field-input:visible")).toHaveCount(0);
  await addStudentDetails(page, { wait: "6" });
  await page.reload();
  await expectResumeScreen(page, "Student Loan Growth and Payoff");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByLabel(/Months with no payments/)).toHaveValue("6");
  // A bad value opens More options by itself, with the red note showing.
  await openMoreOptions(page);
  await page.getByLabel(/Months with no payments/).fill("abc");
  await page.reload();
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", true);
  await expect(page.getByLabel(/Months with no payments/)).toBeVisible();
  await expect(page.getByLabel(/Months with no payments/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("details.nt-more .nt-errnote")).toBeVisible();
});

test("No thanks hides the prompt and leaves the boxes blank", async ({ page }) => {
  await page.getByLabel("Loan balance").fill("1200");
  await page.goto("about:blank");
  await page.goto("#/tools/student-loan-growth-and-payoff");
  // A saved copy with blank boxes opens a screen of its own, in place of step 1.
  await expectResumeScreen(page, "Student Loan Growth and Payoff");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expectNoSavedCopy(page);
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Loan balance")).toHaveValue("");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("numbers come back after leaving, on the same screen", async ({ page }) => {
  await walkStudent(page, { balance: "1200", rate: "0", payment: "" });
  await expect(balanceCard(page)).toContainText("$1,200.00");
  await page.goto("about:blank");
  await page.goto("#/tools/student-loan-growth-and-payoff");
  await expectResumeScreen(page, "Student Loan Growth and Payoff");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(balanceCard(page)).toContainText("$1,200.00");
  await changeNumbers(page, 3);
  await expect(page.getByLabel("Loan balance")).toHaveValue("1200");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillGolden(page);
  await expect(paidCard(page)).toContainText("May 2033");
  await page.screenshot({ path: shotPath("student-loan-growth-and-payoff-desktop.png"), fullPage: true });
});
