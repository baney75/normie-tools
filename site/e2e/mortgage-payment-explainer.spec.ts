import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import {
  changeNumbers, continueToAnswer, expectAnsweredButtons, expectBlockedUntilReady, expectFirstStepWaiting, expectNoSidewaysScroll,
  expectOnStep, expectStepTargets, expectTrustLine, next, nextButton, openMoreOptions, reopenStep, seedSaved,
  expectResumeScreen, expectNoSavedCopy, expectOnAnswer,
} from "./answer-first";
import { addMortgageExtras, MORTGAGE_SEE, openFresh, pickMortgageTerm, walkMortgage } from "./walk";

// The golden answers come from tools/mortgage-payment-explainer/tests/golden.json (worked out apart from the code).
// The tool is four questions, one per screen: Price, Down payment, Rate, How long. Then the answer screen.
// Tax, insurance and fees wait behind a button on the answer screen.
test.use({ viewport: { width: 390, height: 844 } });

const ID = "mortgage-payment-explainer";
const QUESTION = "What will my house payment be?";
const WAITING = "Type your numbers to see your monthly payment.";
const card = (page: import("@playwright/test").Page) => page.getByLabel("Total monthly payment");

// The full breakdown (parts, loan length, first payment) is inside "See all the numbers".
async function openAll(page: import("@playwright/test").Page) {
  await page.getByText("See all the numbers", { exact: true }).click();
  return page.locator("details").filter({ has: page.getByText("See all the numbers", { exact: true }) });
}

const BASIC = { price: "$300,000", down: "$60,000", rate: "6", term: "30" };

async function fillBasic(page: import("@playwright/test").Page) {
  await walkMortgage(page, BASIC);
  await addMortgageExtras(page, { tax: "$3,600", insurance: "$1,200", hoa: "$50" });
}

test.beforeEach(async ({ page }) => {
  await openFresh(page, ID, "Home price");
});

test("opens on step 1 with an empty box, and Continue is the one main button that leads to the box", async ({ page }) => {
  await expectFirstStepWaiting(page, { total: 4, question: "What does the home cost?", firstBox: "Home price", missing: "Type the home price first." });
  await expect(page.getByText("Mortgage Payment Explainer", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await expect(page.getByText(/There is no Send button/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expect(page.getByLabel("Down payment")).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("steps 2, 3 and 4 open empty and each waits for its answer", async ({ page }) => {
  await page.getByLabel("Home price").fill("250,000");
  await next(page);
  await expectOnStep(page, 2, 4, "How much will you pay at the start?");
  await expect(page.getByLabel("Down payment")).toHaveValue("");
  await expectBlockedUntilReady(page, "Type your down payment first. Type 0 if none. It must be less than the price.", "Down payment");
  await page.getByLabel("Down payment").fill("0");
  await next(page);
  await expectOnStep(page, 3, 4, "What is the yearly interest rate?");
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await expectBlockedUntilReady(page, "Type the rate first.", "Yearly interest rate");
  await page.getByLabel("Yearly interest rate").fill("6");
  await next(page);
  await expectOnStep(page, 4, 4, "How long is the loan?");
  for (const years of ["15 years", "20 years", "30 years", "Other"]) {
    await expect(page.getByLabel(years, { exact: true })).not.toBeChecked();
  }
  await expect(nextButton(page)).toHaveText(MORTGAGE_SEE);
  await nextButton(page).click();
  await expect(page.locator(".nt-flow-missing")).toHaveText("Pick how long the loan is first.");
  await expectOnStep(page, 4, 4, "How long is the loan?");
});

test("a saved copy that has no answer yet shows the waiting text on the answer screen", async ({ page }) => {
  await seedSaved(page, ID, 4, { price: "300000", down: "", rate: "", term: "", tax: "", insurance: "", hoa: "", pmi: "" });
  await page.reload();
  await expectResumeScreen(page, "Mortgage Payment Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText(WAITING);
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});

test("with an answer, Done is the one filled button, Continue is gone, and Print or save opens the sheet", async ({ page }) => {
  await walkMortgage(page, { price: "300,000", down: "60,000", rate: "6.5", term: "30" });
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("$1,516.96");
  await expect(card(page)).toContainText("For a $300,000 home, $60,000 down, at 6.5% for 30 years.");
  await expectOnAnswer(page, 4);
  await expect(nextButton(page)).toHaveCount(0);
  await expectAnsweredButtons(page, MORTGAGE_SEE);
});

test("Start over, Clear the boxes empties the boxes, stays on the answer screen, and Change my numbers opens step 1 blank", async ({ page }) => {
  await walkMortgage(page, { price: "250,000", down: "10,000", rate: "6", term: "25" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  // Clearing stays on the answer screen, so Put it back is right here. Change my numbers goes to step 1.
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await expect(card(page)).toContainText(WAITING);
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await changeNumbers(page, 4);
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await page.getByLabel("Home price").fill("1");
  await next(page);
  await expect(page.getByLabel("Down payment")).toHaveValue("");
  await page.getByLabel("Down payment").fill("0");
  await next(page);
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("");
  await page.getByLabel("Yearly interest rate").fill("1");
  await next(page);
  // Cleared too: no chip is picked, "Other" is closed again, and its box is gone.
  for (const years of ["15 years", "20 years", "30 years", "Other"]) {
    await expect(page.getByLabel(years, { exact: true })).not.toBeChecked();
  }
  await expect(page.getByLabel("Years to pay it back")).toHaveCount(0);
});

test("gives the exact total, parts, total interest and first payment, with no sideways scroll", async ({ page }) => {
  await fillBasic(page);
  await expect(card(page)).toContainText("$1,888.92");
  await expect(card(page)).toContainText("$240,000.00");
  await expect(card(page)).toContainText("30 years");
  // The parts and the first payment are inside "See all the numbers".
  const all = await openAll(page);
  await expect(all).toContainText("$278,012.58");
  await expect(all).toContainText("$1,438.92");
  await expect(all).toContainText("$300.00");
  const first = page.getByRole("region", { name: "Your first payment" });
  await expect(first).toContainText("$1,200.00");
  await expect(first).toContainText("$238.92");
  await expectNoSidewaysScroll(page);
  await page.screenshot({ path: shotPath("mortgage-payment-explainer-phone.png"), fullPage: true });
});

test("quick year picks and mortgage insurance work", async ({ page }) => {
  await walkMortgage(page, { price: "250,000", down: "12,500", rate: "7.25", term: "15" });
  await addMortgageExtras(page, { tax: "2750.50", insurance: "1500.25", hoa: "120", pmi: "95.10" });
  await expect(card(page)).toContainText("$2,737.38");
  const all = await openAll(page);
  await expect(all).toContainText("$2,168.05");
  await expect(all).toContainText("$229.21");
  await expect(all).toContainText("$125.02");
  await expect(all).toContainText("$95.10");
  await expectNoSidewaysScroll(page);
});

test("messy typing shows a calm error that names the field, and Continue waits", async ({ page }) => {
  await page.getByLabel("Home price").fill("lots of money");
  await expect(page.getByText("Home price: use a number above zero")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await nextButton(page).click();
  await expectOnStep(page, 1, 4, "What does the home cost?");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Type the home price first.");
  await page.getByLabel("Home price").fill("1e3");
  await expect(page.getByText("Home price: use a number above zero")).toBeVisible();
  await page.getByLabel("Home price").fill(" 1,000.50 ");
  await expect(page.getByText("Home price: use a number above zero")).toHaveCount(0);
  await next(page);
  await expectOnStep(page, 2, 4, "How much will you pay at the start?");
  await page.getByLabel("Down payment").fill("0");
  await next(page);
  await page.getByLabel("Yearly interest rate").fill("6");
  await next(page);
  await pickMortgageTerm(page, "30");
  await next(page, MORTGAGE_SEE);
  await expect(card(page)).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more, on every step", async ({ page }) => {
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Home price").fill("300000");
  await next(page);
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Down payment").fill("0");
  await next(page);
  expect(await expectStepTargets(page)).toBe(1);
  await page.getByLabel("Yearly interest rate").fill("6");
  await next(page);
  // Four length chips.
  expect(await expectStepTargets(page)).toBe(4);
  await page.getByLabel("Other", { exact: true }).check();
  // Four length chips and the years box.
  expect(await expectStepTargets(page)).toBe(5);
  await page.getByLabel("Years to pay it back").fill("30");
  await next(page, MORTGAGE_SEE);
  // The answer screen: open the optional boxes so they are measured too.
  await addMortgageExtras(page, {});
  // Tax, insurance, neighborhood fee, mortgage insurance.
  expect(await expectStepTargets(page, ".nt-field-input")).toBe(4);
  await expectNoSidewaysScroll(page);
});

test("the optional boxes wait inside the closed More options on the answer screen, and it opens by itself for a red note", async ({ page }) => {
  await walkMortgage(page, { price: "300000", down: "0", rate: "6", term: "30" });
  await expect(page.getByRole("button", { name: "Add tax, insurance and fees, if you know them" })).toHaveCount(0);
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByLabel("Property tax for the year")).toBeHidden();
  await expect(page.getByLabel("Mortgage insurance each month")).toBeHidden();
  await expect(page.locator(".nt-flow-answer .nt-field-input:visible")).toHaveCount(0);
  await addMortgageExtras(page, {});
  await expect(page.getByLabel("Property tax for the year")).toBeVisible();
  await expect(page.getByLabel("Mortgage insurance each month")).toBeVisible();
  await page.getByLabel("Property tax for the year").fill("$3,600");
  await page.reload();
  await expectResumeScreen(page, "Mortgage Payment Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByLabel("Property tax for the year")).toHaveValue("$3,600");
  // A bad value opens More options by itself, with the red note showing.
  await openMoreOptions(page);
  await page.getByLabel("Property tax for the year").fill("abc");
  await page.reload();
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", true);
  await expect(page.getByLabel("Property tax for the year")).toBeVisible();
  await expect(page.getByLabel("Property tax for the year")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("details.nt-more .nt-errnote")).toBeVisible();
});

test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await walkMortgage(page, { price: "300000", down: "60000", rate: "6", term: "30" });
  await expect(card(page)).toContainText("$1,438.92");
  await changeNumbers(page, 4);
  await next(page);
  await next(page);
  await expect(page.getByLabel("Yearly interest rate")).toHaveValue("6");
  await page.getByLabel("Yearly interest rate").fill("7");
  await continueToAnswer(page);
  await expect(card(page)).toContainText("$1,596.73");
  await expect(card(page)).not.toContainText("$1,438.92");
});

test("No thanks hides the prompt and leaves the boxes blank", async ({ page }) => {
  await page.getByLabel("Home price").fill("130000");
  await page.goto("about:blank");
  await page.goto("#/tools/mortgage-payment-explainer");
  // A saved copy with blank boxes opens a screen of its own, in place of step 1.
  await expectResumeScreen(page, "Mortgage Payment Explainer");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expectNoSavedCopy(page);
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Home price")).toHaveValue("");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("numbers come back after leaving, on the same screen", async ({ page }) => {
  await walkMortgage(page, { price: "130000", down: "10000", rate: "0", term: "10" });
  await expect(card(page)).toContainText("$1,000.00");
  await page.goto("about:blank");
  await page.goto("#/tools/mortgage-payment-explainer");
  await expectResumeScreen(page, "Mortgage Payment Explainer");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(card(page)).toContainText("$1,000.00");
  await reopenStep(page, 1, 4);
  await expect(page.getByLabel("Home price")).toHaveValue("130000");
  await next(page);
  await next(page);
  await next(page);
  await expect(page.getByLabel("Years to pay it back")).toHaveValue("10");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillBasic(page);
  await expect(card(page)).toContainText("$1,888.92");
  await page.screenshot({ path: shotPath("mortgage-payment-explainer-desktop.png"), fullPage: true });
});
