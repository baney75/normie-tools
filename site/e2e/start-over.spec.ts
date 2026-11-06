import { expect, test, type Page } from "@playwright/test";
import { changeNumbers, expectNoSidewaysScroll, nextButton, openMoreOptions } from "./answer-first";
import { openFresh, walkBudget, walkLoan, walkMortgage, walkOffers, walkStudent, walkUnit } from "./walk";

test.use({ viewport: { width: 390, height: 844 } });

// Start over lives on the answer screen, inside a closed "More options" box. Clear the boxes stays on that screen,
// shows "Your numbers are cleared. Put it back", and Put it back brings the numbers and the answer back.
const TOOLS: { id: string; firstBox: string; typed: string; steps: number; walk: (page: Page) => Promise<void> }[] = [
  { id: "loan-explainer", firstBox: "Amount borrowed", typed: "1234", steps: 3, walk: (p) => walkLoan(p, { amount: "1234", rate: "5", term: "36" }) },
  { id: "loan-offer-compare", firstBox: "Offer 1: Amount borrowed", typed: "1234", steps: 4, walk: (p) => walkOffers(p, [{ amount: "1234", rate: "5", term: "12" }, { amount: "1234", rate: "6", term: "12" }]) },
  { id: "mortgage-payment-explainer", firstBox: "Home price", typed: "1234", steps: 4, walk: (p) => walkMortgage(p, { price: "1234", down: "0", rate: "5", term: "30" }) },
  { id: "student-loan-growth-and-payoff", firstBox: "Loan balance", typed: "1234", steps: 3, walk: (p) => walkStudent(p, { balance: "1234", rate: "5" }) },
  { id: "monthly-budget", firstBox: "Pay, per month", typed: "1234", steps: 2, walk: (p) => walkBudget(p, { pay: "1234", spend: { Food: "34" } }) },
  { id: "unit-converter", firstBox: "Number", typed: "1234", steps: 2, walk: (p) => walkUnit(p, { kind: "Length", value: "1234" }) },
];

for (const t of TOOLS) {
  test(`${t.id}: Start over clears the boxes and Put it back restores them`, async ({ page }) => {
    await openFresh(page, t.id, t.id === "unit-converter" ? "Length" : t.firstBox);
    // Start over only shows once there is something to clear, and only on the answer screen.
    await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
    await t.walk(page);
    // Start over waits inside a closed "More options" box, with a short note that it can be undone.
    const more = page.locator("details.nt-more");
    await expect(more.locator("summary")).toHaveText("More options");
    await expect(more).toHaveJSProperty("open", false);
    await expect(page.getByRole("button", { name: "Start over" })).toBeHidden();
    await openMoreOptions(page);
    await expect(page.locator(".nt-startover-note")).toBeVisible();
    await expect(page.locator(".nt-startover-note")).toHaveText("You can put your numbers back.");

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Clear the boxes" }).click();
    await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
    // The Put it back message shows outside the details, on the answer screen.
    await expect(page.locator("details.nt-more")).toHaveCount(0);
    await expect(page.locator(".nt-flow-answer")).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("nt:flow:")))).toEqual([]);
    // Change my numbers opens step 1 with the box blank.
    await changeNumbers(page, t.steps);
    if (t.id === "unit-converter") {
      await nextButton(page).click();
      await expect(page.getByLabel("Number", { exact: true })).toHaveValue("");
    } else {
      await expect(page.getByLabel(t.firstBox, { exact: true })).toHaveValue("");
    }
  });

  test(`${t.id}: Put it back restores the numbers and the answer`, async ({ page }) => {
    await openFresh(page, t.id, t.id === "unit-converter" ? "Length" : t.firstBox);
    await t.walk(page);
    const answer = await page.locator("#nt-answer").evaluate((el) => el.textContent ?? "");
    await openMoreOptions(page);
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Clear the boxes" }).click();
    await expect(page.getByText(/Your numbers are cleared\./)).toBeVisible();
    await page.getByRole("button", { name: "Put it back" }).click();
    await expect(page.getByText(/Your numbers are cleared\./)).toHaveCount(0);
    await expect(page.locator("#nt-answer")).toHaveText(answer);
    await changeNumbers(page, t.steps);
    if (t.id === "unit-converter") await nextButton(page).click();
    await expect(page.getByLabel(t.firstBox, { exact: true })).toHaveValue(t.typed);
    await expectNoSidewaysScroll(page);
  });
}

test("monthly-budget: Remove has its own note on the spending step", async ({ page }) => {
  await openFresh(page, "monthly-budget", "Pay, per month");
  await nextButton(page).click();
  await expect(page.getByText("Remove asks first. You can put it back.", { exact: true })).toBeVisible();
});
