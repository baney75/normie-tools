import { expect, test, type Page } from "@playwright/test";
import { shotPath } from "./paths";
import {
  changeNumbers, expectAnsweredButtons, expectBlockedUntilReady, expectNoSidewaysScroll, expectOnStep, expectStepTargets, expectTrustLine,
  next, nextButton, openMoreOptions, reopenStep, seedSaved,
  expectResumeScreen, expectNoSavedCopy, expectOnAnswer,
} from "./answer-first";
import { openFresh, UNIT_SEE, walkUnit } from "./walk";

// The golden answers come from tools/unit-converter/tests/golden.json (worked out apart from the code).
// Two screens of questions: what you are measuring (chips), then the number with From and To. Then the answer screen.
test.use({ viewport: { width: 390, height: 844 } });

const ID = "unit-converter";
const QUESTION = "Change cups, inches, pounds and more";
const card = (page: Page) => page.getByLabel("Your answer", { exact: true });

test.beforeEach(async ({ page }) => {
  await openFresh(page, ID, "Length");
});

test("opens on step 1 with Length picked, and Continue is the one main button", async ({ page }) => {
  await expectOnStep(page, 1, 2, "What are you measuring?");
  await expect(page.getByText("Unit Converter", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  for (const kind of ["Length", "Weight", "Volume", "Temperature", "Speed"]) {
    await expect(page.getByLabel(kind, { exact: true })).toHaveCount(1);
  }
  await expect(page.getByLabel("Length", { exact: true })).toBeChecked();
  await expect(page.locator(".primary")).toHaveCount(1);
  await expect(nextButton(page)).toHaveClass(/primary/);
  await expect(nextButton(page)).toHaveText("Continue");
  await expect(page.getByRole("link", { name: "Back to tools", exact: true })).toHaveAttribute("href", "#/");
  await expect(page.getByRole("link", { name: "I'm done", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Type my own number" })).toHaveCount(0);
  await expect(page.getByLabel("Number")).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("step 2 opens with an empty number and the usual From and To, and Continue waits for the number", async ({ page }) => {
  await next(page);
  await expectOnStep(page, 2, 2, "Type the number");
  await expect(page.getByLabel("Number")).toHaveValue("");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("inch");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("millimeter");
  await expect(nextButton(page)).toHaveText(UNIT_SEE);
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expectBlockedUntilReady(page, "Type a number first.", "Number");
});

test("a saved copy that has no number yet shows the waiting text on the answer screen", async ({ page }) => {
  // Weight with no number: something was chosen, so it is kept. (A copy with nothing chosen is not kept at all.)
  await seedSaved(page, ID, 2, { category: "weight", from: "pound", to: "kilogram", value: "" });
  await page.reload();
  await expectResumeScreen(page, "Unit Converter");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("Type a number to see your answer.");
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});

test("with an answer, Done is the one filled button, Continue is gone, and Print or save opens the sheet", async ({ page }) => {
  await walkUnit(page, { kind: "Length", value: "12" });
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(card(page)).toContainText("304.8 millimeters");
  await expectOnAnswer(page, 2);
  await expect(nextButton(page)).toHaveCount(0);
  await expectAnsweredButtons(page, UNIT_SEE, "answer");
});

test("Start over, Clear the boxes empties the number, stays on the answer screen, and Change my numbers opens the blank number step", async ({ page }) => {
  await walkUnit(page, { kind: "Length", value: "2" });
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  // Clearing stays on the answer screen, so Put it back is right here. Change my numbers goes to the number step, the
  // first one that needs something; Back from there shows Length still picked.
  await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
  await expect(card(page)).toContainText("Type a number to see your answer.");
  await expect(page.getByRole("link", { name: "I'm done" })).toHaveCount(0);
  await changeNumbers(page, 2, 2);
  await expect(page.getByLabel("Number")).toHaveValue("");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Length", { exact: true })).toBeChecked();
});

test("gives the exact answer, with no sideways scroll", async ({ page }) => {
  await walkUnit(page, { kind: "Length", value: "1" });
  await expect(card(page)).toContainText("25.4 millimeters");
  await reopenStep(page, 2, 2);
  await page.getByLabel("From", { exact: true }).selectOption("mile");
  await page.getByLabel("To", { exact: true }).selectOption("kilometer");
  await next(page, UNIT_SEE);
  await expect(card(page)).toContainText("1.60934 kilometers");
  await expectNoSidewaysScroll(page);
  await page.screenshot({ path: shotPath("unit-converter-phone.png"), fullPage: true });
});

test("temperature, swap and a minus sign", async ({ page }) => {
  await walkUnit(page, { kind: "Temperature", value: "98.6" });
  await expect(card(page)).toContainText("37");
  await reopenStep(page, 2, 2);
  await page.getByRole("button", { name: "Swap" }).click();
  await next(page, UNIT_SEE);
  await expect(card(page)).toContainText("209.48");
  await reopenStep(page, 2, 2);
  await page.getByLabel("Number").fill("-40");
  await next(page, UNIT_SEE);
  await expect(card(page)).toContainText("-40");
});

test("cooking measures give the exact gallon parts", async ({ page }) => {
  await walkUnit(page, { kind: "Volume", value: "1", from: "gallon", to: "cup" });
  await expect(card(page)).toContainText("16 US cups");
  await reopenStep(page, 2, 2);
  await page.getByLabel("From", { exact: true }).selectOption("cup");
  await page.getByLabel("To", { exact: true }).selectOption("milliliter");
  await next(page, UNIT_SEE);
  await expect(card(page)).toContainText("236.588 milliliters");
});

test("messy typing shows a calm error that names the field, and Continue waits", async ({ page }) => {
  await next(page);
  await page.getByLabel("Number").fill("lots of inches");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await nextButton(page).click();
  await expectOnStep(page, 2, 2, "Type the number");
  await expect(page.locator(".nt-flow-missing")).toHaveText("Fix the note above to see your answer.");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
  await page.getByLabel("Number").fill("1e3");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toBeVisible();
  await page.getByLabel("Number").fill(" 1,000 ");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toHaveCount(0);
  await next(page, UNIT_SEE);
  await expect(card(page)).toContainText("25,400 millimeters");
});

test("tap targets are 44px or more and text is 16px or more, on every step", async ({ page }) => {
  // Step 1: five category chips. Step 2: the number box, the two lists and Swap.
  expect(await expectStepTargets(page, ".nt-field-input, .nt-unit-select, .nt-unit-swap, .nt-chip")).toBe(5);
  await next(page);
  expect(await expectStepTargets(page, ".nt-field-input, .nt-unit-select, .nt-unit-swap, .nt-chip")).toBe(4);
  await expectNoSidewaysScroll(page);
});

test("changing the numbers changes the answer to the right new answer", async ({ page }) => {
  await walkUnit(page, { kind: "Length", value: "12" });
  await expect(card(page)).toContainText("304.8 millimeters");
  await reopenStep(page, 2, 2);
  await page.getByLabel("Number").fill("24");
  await next(page, UNIT_SEE);
  await expect(card(page)).toContainText("609.6 millimeters");
  await expect(card(page)).not.toContainText("304.8 millimeters");
});

test("No thanks hides the prompt and leaves the number blank", async ({ page }) => {
  await next(page);
  await page.getByLabel("Number").fill("12");
  await page.goto("about:blank");
  await page.goto("#/tools/unit-converter");
  // A saved copy with blank boxes opens a screen of its own, in place of step 1.
  await expectResumeScreen(page, "Unit Converter");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expectNoSavedCopy(page);
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await next(page);
  await expect(page.getByLabel("Number")).toHaveValue("");
  await expect(page.locator("#nt-answer")).toHaveCount(0);
});

test("numbers come back after leaving, on the same screen", async ({ page }) => {
  await walkUnit(page, { kind: "Length", value: "12" });
  await expect(card(page)).toContainText("304.8 millimeters");
  await page.goto("about:blank");
  await page.goto("#/tools/unit-converter");
  await expectResumeScreen(page, "Unit Converter");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(card(page)).toContainText("304.8 millimeters");
  await changeNumbers(page, 2);
  await next(page);
  await expect(page.getByLabel("Number")).toHaveValue("12");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await walkUnit(page, { kind: "Speed", value: "60" });
  await expect(card(page)).toContainText("96.5606 kilometers per hour");
  await page.screenshot({ path: shotPath("unit-converter-desktop.png"), fullPage: true });
});
