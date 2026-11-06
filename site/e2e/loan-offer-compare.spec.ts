import { expect, test, type Page } from "@playwright/test";
import { shotPath } from "./paths";
import {
  changeNumbers, continueToAnswer, expectAnsweredButtons, expectBlockedUntilReady, expectFirstStepWaiting, expectNoSidewaysScroll,
  expectOnStep, expectStepTargets, expectTrustLine, next, nextButton, openMoreOptions, reopenStep, seedSaved,
  expectResumeScreen, expectNoSavedCopy, expectOnAnswer,
} from "./answer-first";
import { addThirdOffer, OFFERS_SEE, openFresh, walkOffer, walkOffers } from "./walk";

// The golden answers come from tools/loan-offer-compare/tests/golden.json (worked out apart from the code).
// Two steps per offer: how much and what rate, then how long and any fees. Four steps for two offers; a third offer adds steps 5 and 6.
// The card holds the answer and each offer's interest and fees. Monthly payments and the rest are in "See all the numbers".
test.use({ viewport: { width: 390, height: 844 } });

const ID = "loan-offer-compare";
const QUESTION = "Which loan offer costs less to borrow?";
const cardName = "Costs less to borrow";
const card = (page: Page) => page.getByLabel(cardName);

// The full table is inside "See all the numbers".
async function openAll(page: Page) {
  await page.getByText("See all the numbers", { exact: true }).click();
  return page.locator("details").filter({ has: page.getByText("See all the numbers", { exact: true }) });
}

test.beforeEach(async ({ page }) => {
  await openFresh(page, ID, "Offer 1: Amount borrowed");
});

test("opens on step 1 with empty boxes, and Continue is the one main button that leads to the first box", async ({ page }) => {
  await expectFirstStepWaiting(page, { total: 4, question: "Offer 1: how much, at what rate?", firstBox: "Offer 1: Amount borrowed", missing: "Type the amount and the rate first." });
  await expect(page.getByText("Loan Offer Compare", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Offer 1: Yearly interest rate")).toHaveValue("");
  await expect(page.getByText(/There is no Send button/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveCount(0);
  await expect(page.getByLabel("Offer 2: Amount borrowed")).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("steps 2, 3 and 4 open empty and each waits for its answer", async ({ page }) => {
  await page.getByLabel("Offer 1: Amount borrowed").fill("12,000");
  await page.getByLabel("Offer 1: Yearly interest rate").fill("7.5");
  await next(page);
  await expectOnStep(page, 2, 4, "Offer 1: how long, and any fees?");
  await expect(page.getByLabel("Offer 1: How long is the loan?")).toHaveValue("");
  await expectBlockedUntilReady(page, "Type how long the loan is first. Fees can stay empty.", "Offer 1: How long is the loan?");
  await page.getByLabel("Offer 1: How long is the loan?").fill("36");
  await next(page);
  await expectOnStep(page, 3, 4, "Offer 2: how much, at what rate?");
  await expect(page.getByLabel("Offer 2: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Offer 2: Yearly interest rate")).toHaveValue("");
  await expectBlockedUntilReady(page, "Type the amount and the rate first.", "Offer 2: Amount borrowed");
  await page.getByLabel("Offer 2: Amount borrowed").fill("12,000");
  await page.getByLabel("Offer 2: Yearly interest rate").fill("6.9");
  await next(page);
  await expectOnStep(page, 4, 4, "Offer 2: how long, and any fees?");
  await expect(nextButton(page)).toHaveText(OFFERS_SEE);
  await expectBlockedUntilReady(page, "Type how long the loan is first. Fees can stay empty.", "Offer 2: How long is the loan?");
});

test("a saved copy that has no answer yet shows the waiting text on the answer screen", async ({ page }) => {
  const blank = { amount: "", rate: "", term: "", termUnit: "months", fees: "" };
  await seedSaved(page, ID, 4, { offers: [{ ...blank, amount: "5000" }, blank] });
  await page.reload();
  await expectResumeScreen(page, "Loan Offer Compare");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("Type both offers to see which costs less.");
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});

test("with an answer, Done is the one filled button, Continue is gone, and Print or save opens the sheet", async ({ page }) => {
  await walkOffers(page, [
    { amount: "12,000", rate: "7.5", term: "3", unit: "Years" },
    { amount: "12,000", rate: "6.9", term: "3", unit: "Years", fees: "400" },
  ]);
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("Offer 2");
  await expectOnAnswer(page, 4);
  await expect(nextButton(page)).toHaveCount(0);
  await expectAnsweredButtons(page, OFFERS_SEE);
});

test("Start over, Clear the boxes empties the boxes, stays on the answer screen, and Change my numbers opens step 1 blank", async ({ page }) => {
  await walkOffers(page, [
    { amount: "10,000", rate: "6", term: "36" },
    { amount: "10,000", rate: "5", term: "48" },
  ]);
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  // Clearing stays on the answer screen, so Put it back is right here. Change my numbers goes to step 1.
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await expect(card(page)).toContainText("Type both offers to see which costs less.");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await changeNumbers(page, 4);
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Offer 1: Yearly interest rate")).toHaveValue("");
  await page.getByLabel("Offer 1: Amount borrowed").fill("1");
  await page.getByLabel("Offer 1: Yearly interest rate").fill("1");
  await next(page);
  await expect(page.getByLabel("Offer 1: How long is the loan?")).toHaveValue("");
  await page.getByLabel("Offer 1: How long is the loan?").fill("1");
  await next(page);
  await expect(page.getByLabel("Offer 2: Amount borrowed")).toHaveValue("");
  await expect(page.getByLabel("Offer 2: Yearly interest rate")).toHaveValue("");
});

test("gives the exact numbers for two offers and names the lowest, with no sideways scroll", async ({ page }) => {
  await walkOffers(page, [
    { amount: "$10,000", rate: "6", term: "36" },
    { amount: "10,000", rate: "5", term: "48", fees: "$200" },
  ]);
  // The card holds the answer and each offer's interest and fees.
  await expect(card(page)).toContainText("Offer 1");
  await expect(card(page)).toContainText("Offer 1, interest and fees");
  await expect(card(page)).toContainText("$951.88");
  await expect(card(page)).toContainText("Offer 2, interest and fees");
  await expect(card(page)).toContainText("$1,254.11");
  // The monthly payments and the full table are in "See all the numbers".
  const all = await openAll(page);
  const row = (name: string) => all.getByRole("row", { name: new RegExp(name) });
  await expect(row("monthly payment")).toContainText("$304.22");
  await expect(row("monthly payment")).toContainText("$230.29");
  await expect(row("Total paid")).toContainText("$10,951.88");
  await expect(row("Total interest")).toContainText("$951.88");
  await expect(row("Cost of borrowing")).toContainText("$951.88");
  await expect(row("Cost of borrowing")).toContainText("$1,254.11");
  await expect(all).toContainText("Lowest monthly payment: Offer 2");
  await expect(page.locator("body")).not.toContainText(/\bbest\b/i);
  await expectNoSidewaysScroll(page);
  await page.screenshot({ path: shotPath("loan-offer-compare-phone.png"), fullPage: true });
});

test("a third offer can be added, and a tie names every offer", async ({ page }) => {
  await walkOffers(page, [
    { amount: "5000", rate: "4", term: "24", fees: "50" },
    { amount: "5000", rate: "4", term: "24", fees: "50" },
  ]);
  await expect(card(page)).toContainText("Offer 1 and Offer 2");
  // A third offer is an extra, so it waits in the closed "More options".
  await expect(page.getByRole("button", { name: "Add a third offer" })).toBeHidden();
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Add a third offer" }).click();
  // Steps 5 and 6 are the third offer, empty. Continue waits for it.
  await expectOnStep(page, 5, 6, "Offer 3: how much, at what rate?");
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveValue("");
  await expectBlockedUntilReady(page, "Type the amount and the rate first.", "Offer 3: Amount borrowed");
  await page.getByLabel("Offer 3: Amount borrowed").fill("5000");
  await page.getByLabel("Offer 3: Yearly interest rate").fill("3");
  await next(page);
  await expectOnStep(page, 6, 6, "Offer 3: how long, and any fees?");
  await page.getByLabel("Offer 3: How long is the loan?").fill("24");
  await page.getByRole("group", { name: "Offer 3", exact: true }).getByLabel("Months", { exact: true }).check();
  await page.getByLabel("Offer 3: Upfront fees").fill("50");
  await next(page, OFFERS_SEE);
  await expect(card(page)).toContainText("Offer 3, interest and fees");
  const all = await openAll(page);
  await expect(all).toContainText("Lowest monthly payment: Offer 3");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Remove the third offer" }).click();
  await expect(card(page)).not.toContainText("Offer 3");
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(card(page)).toContainText("Offer 3, interest and fees");
  await reopenStep(page, 5, 6);
  await expect(page.getByLabel("Offer 3: Amount borrowed")).toHaveValue("5000");
  await expectNoSidewaysScroll(page);
});

test("messy typing shows a calm error that names the offer and field, and Continue waits", async ({ page }) => {
  await walkOffer(page, 1, { amount: "1000", rate: "5", term: "12" }, false);
  await page.getByLabel("Offer 2: Amount borrowed").fill("lots of money");
  await page.getByLabel("Offer 2: Yearly interest rate").fill("5");
  await expect(page.getByText("Offer 2: Amount borrowed: use a number above zero")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await nextButton(page).click();
  await expectOnStep(page, 3, 4, "Offer 2: how much, at what rate?");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Type the amount and the rate first.");
  await page.getByLabel("Offer 2: Amount borrowed").fill("1e3");
  await expect(page.getByText("Offer 2: Amount borrowed: use a number above zero")).toBeVisible();
  await page.getByLabel("Offer 2: Amount borrowed").fill(" 1,000.50 ");
  await expect(page.getByText("Offer 2: Amount borrowed: use a number above zero")).toHaveCount(0);
  await next(page);
  await page.getByLabel("Offer 2: How long is the loan?").fill("12");
  await page.getByRole("group", { name: "Offer 2", exact: true }).getByLabel("Months", { exact: true }).check();
  await next(page, OFFERS_SEE);
  await expect(card(page)).toBeVisible();
});

test("tap targets are 44px or more and text is 16px or more, on every step", async ({ page }) => {
  // Each offer: step A has the amount and rate boxes; step B has the length box, the fees box, and the Months/Years chips.
  let boxes = 0;
  let chips = 0;
  for (const n of [1, 2]) {
    expect(await expectStepTargets(page, ".nt-field-input")).toBe(2);
    boxes += 2;
    await page.getByLabel(`Offer ${n}: Amount borrowed`).fill("1000");
    await page.getByLabel(`Offer ${n}: Yearly interest rate`).fill("5");
    await next(page);
    expect(await expectStepTargets(page, ".nt-field-input")).toBe(2);
    expect(await expectStepTargets(page, ".nt-chip")).toBe(2);
    boxes += 2;
    chips += 2;
    await page.getByLabel(`Offer ${n}: How long is the loan?`).fill("12");
    await page.getByRole("group", { name: `Offer ${n}`, exact: true }).getByLabel("Months", { exact: true }).check();
    if (n === 1) await next(page);
    else await next(page, OFFERS_SEE);
  }
  expect(boxes).toBe(8);
  expect(chips).toBe(4);
  await openMoreOptions(page);
  const add = page.getByRole("button", { name: "Add a third offer" });
  expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSidewaysScroll(page);
});

test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await walkOffers(page, [
    { amount: "10000", rate: "6", term: "36" },
    { amount: "10000", rate: "5", term: "48" },
  ]);
  await expect(card(page)).toContainText("$951.88");
  await reopenStep(page, 1, 4);
  await page.getByLabel("Offer 1: Amount borrowed").fill("12000");
  await page.getByLabel("Offer 1: Yearly interest rate").fill("6.5");
  await continueToAnswer(page);
  await expect(card(page)).toContainText("$1,240.36");
  await expect(card(page)).not.toContainText("$951.88");
});

test("No thanks hides the prompt and leaves the boxes blank", async ({ page }) => {
  await page.getByLabel("Offer 1: Amount borrowed").fill("1200");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-offer-compare");
  // A saved copy with blank boxes opens a screen of its own, in place of step 1.
  await expectResumeScreen(page, "Loan Offer Compare");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expectNoSavedCopy(page);
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("numbers come back after leaving, on the same screen", async ({ page }) => {
  await walkOffers(page, [
    { amount: "1200", rate: "0", term: "12" },
    { amount: "1200", rate: "0", term: "24" },
  ]);
  const all = await openAll(page);
  await expect(all.getByRole("row", { name: /monthly payment/ })).toContainText("$100.00");
  await page.goto("about:blank");
  await page.goto("#/tools/loan-offer-compare");
  await expectResumeScreen(page, "Loan Offer Compare");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(card(page)).toBeVisible();
  const again = await openAll(page);
  await expect(again.getByRole("row", { name: /monthly payment/ })).toContainText("$50.00");
  await reopenStep(page, 1, 4);
  await expect(page.getByLabel("Offer 1: Amount borrowed")).toHaveValue("1200");
  await next(page);
  await expect(page.getByLabel("Offer 1: How long is the loan?")).toHaveValue("12");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await walkOffers(page, [
    { amount: "20,000", rate: "7.25", term: "60", fees: "500" },
    { amount: "20,000", rate: "6.5", term: "60", fees: "900" },
  ]);
  await addThirdOffer(page, { amount: "20,000", rate: "8", term: "48" });
  const all = await openAll(page);
  await expect(all.getByRole("row", { name: /monthly payment/ })).toContainText("$488.26");
  await page.screenshot({ path: shotPath("loan-offer-compare-desktop.png"), fullPage: true });
});
