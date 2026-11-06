import { expect, test, type Page } from "@playwright/test";
import { shotPath } from "./paths";
import {
  changeNumbers, expectAnsweredButtons, expectBigTargets, expectNoSidewaysScroll, expectOnStep, expectStepTargets, expectTrustLine,
  next, nextButton, openMoreOptions, reopenStep, seedSaved,
  expectResumeScreen, expectNoSavedCopy, expectOnAnswer,
} from "./answer-first";
import { BUDGET_SEE, openFresh, walkBudget } from "./walk";

// The golden answers come from tools/monthly-budget/tests/golden.json (worked out apart from the code).
// Two questions, one per screen: the money that comes in, then what you spend. Then the answer screen.
// The page opens with the line names filled in (Pay, Rent or mortgage, Food, ...) and every amount blank.
// Pay may stay empty: Continue still goes on, and the answer screen then says "Type your pay to start."
test.use({ viewport: { width: 390, height: 844 } });

const ID = "monthly-budget";
const QUESTION = "Where does my money go each month?";
const card = (page: Page) => page.getByLabel("Left over each month", { exact: true });

const PLAIN = { pay: "3,000", spend: { "Rent or mortgage": "1,200", Food: "450", Bills: "300", Transport: "250", Other: "100" } } as const;

test.beforeEach(async ({ page }) => {
  await openFresh(page, ID, "Pay, per month");
});

test("opens on step 1 with the line name, a blank amount, and Continue as the one main button", async ({ page }) => {
  await expectOnStep(page, 1, 2, "How much money comes in each month?");
  await expect(page.getByText("Monthly Budget", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  // One income line: one money box and one quiet button, with no name box, Remove button or remove note.
  await expect(page.getByLabel("Pay, per month")).toHaveValue("");
  await expect(page.getByLabel("Pay, per month")).not.toBeFocused();
  await expect(page.getByText("Your pay for one month, after taxes.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add other money that comes in" })).toBeVisible();
  await expect(page.getByLabel("Name of income item 1")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  await expect(page.getByText("Remove asks first. You can put it back.", { exact: true })).toHaveCount(0);
  await expect(page.locator(".primary")).toHaveCount(1);
  await expect(nextButton(page)).toHaveClass(/primary/);
  await expect(nextButton(page)).toHaveText("Continue");
  const back = page.getByRole("link", { name: "Back to tools", exact: true });
  await expect(back).toHaveAttribute("href", "#/");
  await expect(page.getByRole("link", { name: "I'm done", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
});

test("Add other money that comes in shows the full list with names and Remove buttons", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3,000");
  await page.getByRole("button", { name: "Add other money that comes in" }).click();
  await expect(page.getByRole("button", { name: "Add other money that comes in" })).toHaveCount(0);
  await expect(page.getByLabel("Name of income item 1")).toHaveValue("Pay");
  await expect(page.getByLabel("Name of income item 2")).toHaveValue("");
  await expect(page.getByLabel("Pay, per month")).toHaveValue("3,000");
  await expect(page.getByRole("button", { name: "Remove Pay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Income item 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add an income item" })).toBeVisible();
  await expect(page.getByText("Remove asks first. You can put it back.", { exact: true })).toBeVisible();
  await page.getByLabel("Name of income item 2").fill("Gift");
  await page.getByLabel("Gift, per month").fill("50");
  await next(page);
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("$3,050.00");
});

test("step 2 opens with the spending names and blank amounts, and an empty budget says to type your pay", async ({ page }) => {
  await next(page);
  await expectOnStep(page, 2, 2, "What do you spend?");
  await expect(page.getByLabel("Name of spending item 1")).toHaveValue("Rent or mortgage");
  for (const line of ["Rent or mortgage", "Food", "Bills", "Transport", "Other"]) {
    await expect(page.getByLabel(`${line}, per month`)).toHaveValue("");
  }
  await expect(page.getByText("Remove asks first. You can put it back.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expect(nextButton(page)).toHaveText(BUDGET_SEE);
  await next(page, BUDGET_SEE);
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("Type your pay to start.");
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("region", { name: "Where it goes" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
});

test("with an answer, Done is the one filled button, Continue is gone, and Print or save opens the sheet", async ({ page }) => {
  await walkBudget(page, { pay: "3,200", spend: { "Rent or mortgage": "1,200" } });
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("$2,000.00");
  await expect(page.getByRole("region", { name: "Where it goes" })).toBeVisible();
  await expectOnAnswer(page, 2);
  await expect(nextButton(page)).toHaveCount(0);
  await expectAnsweredButtons(page, BUDGET_SEE, "answer");
});

test("Start over, Clear the boxes empties the boxes, stays on the answer screen, and Change my numbers opens step 1 blank", async ({ page }) => {
  await walkBudget(page, { pay: "3,000", spend: { "Rent or mortgage": "1,000" } });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  // Clearing stays on the answer screen, so Put it back is right here. Change my numbers goes to step 1.
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await expect(card(page)).toContainText("Type your pay to start.");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await changeNumbers(page, 2);
  await expect(page.getByLabel("Pay, per month")).toHaveValue("");
  await next(page);
  await expect(page.getByLabel("Rent or mortgage, per month")).toHaveValue("");
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("Type your pay to start.");
});

test("gives exact totals, left over and percents, with no sideways scroll", async ({ page }) => {
  await walkBudget(page, PLAIN);
  await expect(card(page)).toContainText("$700.00");
  await expect(card(page)).toContainText("$3,000.00");
  await expect(card(page)).toContainText("$2,300.00");
  const where = page.getByRole("region", { name: "Where it goes" });
  await expect(where).toContainText("40.0% of income");
  await expect(where).toContainText("15.0% of income");
  await expect(where).toContainText("10.0% of income");
  await expect(where).toContainText("8.3% of income");
  await expect(where).toContainText("3.3% of income");
  await expectNoSidewaysScroll(page);
  await page.screenshot({ path: shotPath("monthly-budget-phone.png"), fullPage: true });
});

test("a negative left over shows a minus sign, and a new line can be added", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1,000");
  await next(page);
  await page.getByLabel("Rent or mortgage, per month").fill("1,100");
  await page.getByRole("button", { name: "Add a spending item" }).click();
  await page.getByLabel("Name of spending item 6").fill("Phone");
  await page.getByLabel("Phone, per month").fill("40.50");
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("-$140.50");
  await page.getByText("See all the numbers", { exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  await expectNoSidewaysScroll(page);
});

test("messy typing shows a calm error that names the line, and Continue waits", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3000");
  await next(page);
  await page.getByLabel("Food, per month").fill("lots of money");
  await expect(page.getByText("Food: use a dollar amount")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await nextButton(page).click();
  await expectOnStep(page, 2, 2, "What do you spend?");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Fix the amount that has a red note first.");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
  await page.getByLabel("Food, per month").fill("1e3");
  await expect(page.getByText("Food: use a dollar amount")).toBeVisible();
  await page.getByLabel("Food, per month").fill(" 1,000.50 ");
  await expect(page.getByText("Food: use a dollar amount")).toHaveCount(0);
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("$1,999.50");
});

test("a bad pay amount stops Continue on step 1", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("lots of money");
  await expect(page.getByText("Pay: use a dollar amount")).toBeVisible();
  await nextButton(page).click();
  await expectOnStep(page, 1, 2, "How much money comes in each month?");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Fix the amount that has a red note first.");
  await expect(page.getByLabel("Pay, per month")).toBeFocused();
});

test("tap targets are 44px or more and text is 16px or more, on every step", async ({ page }) => {
  const lists = ".nt-budget-remove, .nt-budget-list .nt-more-btn";
  // Step 1 with one income line: one money box and the quiet "Add other money that comes in" button.
  expect(await expectStepTargets(page, ".nt-field-input")).toBe(1);
  const addOther = page.getByRole("button", { name: "Add other money that comes in" });
  expect((await addOther.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await addOther.click();
  // The full list: the pay name and amount, a name and amount for the new line, two remove icons and the Add button.
  expect(await expectStepTargets(page, ".nt-field-input")).toBe(4);
  expect(await page.locator(lists).count()).toBe(3);
  for (const b of await page.locator(lists).all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const b of await page.locator(".nt-budget-remove").all()) expect((await b.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await next(page);
  // Step 2: five lines of name and amount, five remove icons and the Add button.
  expect(await expectStepTargets(page, ".nt-field-input")).toBe(10);
  expect(await page.locator(lists).count()).toBe(6);
  for (const b of await page.locator(lists).all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const b of await page.locator(".nt-budget-remove").all()) expect((await b.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await expectBigTargets(page, ".nt-flow-next");
  await expectNoSidewaysScroll(page);
});

test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await walkBudget(page, { pay: "3000", spend: { "Rent or mortgage": "1200" } });
  await expect(card(page)).toContainText("$1,800.00");
  await reopenStep(page, 2, 2);
  await page.getByLabel("Rent or mortgage, per month").fill("1500");
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("$1,500.00");
  await expect(card(page)).not.toContainText("$1,800.00");
});

test("No thanks hides the prompt and leaves the amounts blank", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1200");
  await page.goto("about:blank");
  await page.goto("#/tools/monthly-budget");
  // A saved copy with blank boxes opens a screen of its own, in place of step 1.
  await expectResumeScreen(page, "Monthly Budget");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expectNoSavedCopy(page);
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByLabel("Pay, per month")).toHaveValue("");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("numbers come back after leaving, on the same screen", async ({ page }) => {
  await walkBudget(page, { pay: "1200", spend: { Food: "200" } });
  await expect(card(page)).toContainText("$1,000.00");
  await page.goto("about:blank");
  await page.goto("#/tools/monthly-budget");
  await expectResumeScreen(page, "Monthly Budget");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(card(page)).toContainText("$1,000.00");
  await changeNumbers(page, 2);
  await expect(page.getByLabel("Pay, per month")).toHaveValue("1200");
});

test("a saved copy of the starting lines shows the waiting text on the answer screen", async ({ page }) => {
  const line = (id: string, name: string) => ({ id, name, amount: "" });
  await seedSaved(page, ID, 2, {
    next: 20,
    income: [line("i1", "Pay")],
    expenses: [line("e1", "Rent or mortgage"), line("e2", "Food"), line("e3", "Bills"), line("e4", "Transport"), line("e5", "Other")],
  });
  await page.reload();
  await expectResumeScreen(page, "Monthly Budget");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(card(page)).toContainText("Type your pay to start.");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await walkBudget(page, PLAIN);
  await expect(card(page)).toContainText("$700.00");
  await page.screenshot({ path: shotPath("monthly-budget-desktop.png"), fullPage: true });
});

test("Remove is an icon labeled with the line name, asks first, and Put it back restores the line", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3,000");
  await next(page);
  await page.getByLabel("Food, per month").fill("450");
  await page.getByRole("button", { name: "Remove Food" }).click();
  // It asks first: nothing is gone yet.
  await expect(page.getByLabel("Food, per month")).toHaveValue("450");
  await page.getByRole("button", { name: "Yes, remove it" }).click();
  await expect(page.getByLabel("Food, per month")).toHaveCount(0);
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("$3,000.00");
  await reopenStep(page, 2, 2);
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByLabel("Food, per month")).toHaveValue("450");
  await next(page, BUDGET_SEE);
  await expect(card(page)).toContainText("$2,550.00");
});
