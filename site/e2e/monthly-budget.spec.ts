import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { expectAnsweredButtons, expectSeeHiddenWhenWide, expectTrustLine, expectWaitingButtons, openMoreOptions } from "./answer-first";

// The golden answers come from tools/monthly-budget/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

type Page = import("@playwright/test").Page;

// The page opens with the line names filled in (Pay, Rent or mortgage, Food, ...) and every amount blank.
const card = (page: Page) => page.getByLabel("Left over each month", { exact: true });

async function fillPlain(page: Page) {
  await page.getByLabel("Pay, per month").fill("3,000");
  await page.getByLabel("Rent or mortgage, per month").fill("1,200");
  await page.getByLabel("Food, per month").fill("450");
  await page.getByLabel("Bills, per month").fill("300");
  await page.getByLabel("Transport, per month").fill("250");
  await page.getByLabel("Other, per month").fill("100");
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/monthly-budget");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Pay, per month")).toBeVisible();
});

test("opens with the line names, blank amounts, the waiting text and one main button that leads to the first amount", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Where does my money go each month?" })).toBeVisible();
  await expect(page.getByText("Monthly Budget", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  await expect(page.getByLabel("Name of income item 1")).toHaveValue("Pay");
  await expect(page.getByLabel("Name of spending item 1")).toHaveValue("Rent or mortgage");
  for (const line of ["Pay", "Rent or mortgage", "Food", "Bills", "Transport", "Other"]) {
    await expect(page.getByLabel(`${line}, per month`)).toHaveValue("");
  }
  await expect(card(page)).toContainText("Type your pay to start.");
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("region", { name: "Where it goes" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await expect(page.getByRole("button", { name: "Type my own numbers" })).toHaveCount(0);
  await expectWaitingButtons(page, "See what is left over", "Pay, per month");
});

test("with an answer, Done is the one filled button, See what is left over is gone, and Print or save opens the sheet", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3,200");
  await page.getByLabel("Rent or mortgage, per month").fill("1,200");
  await expect(card(page)).toContainText("$2,000.00");
  await expect(page.getByRole("region", { name: "Where it goes" })).toBeVisible();
  await expectAnsweredButtons(page, "See what is left over", "answer");
  await expectSeeHiddenWhenWide(page, "See what is left over");
});

test("Start over, Clear the boxes empties the boxes and shows the waiting text", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3,000");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Pay, per month")).toHaveValue("");
  await expect(page.getByLabel("Rent or mortgage, per month")).toHaveValue("");
  await expect(card(page)).toContainText("Type your pay to start.");
});

test("gives exact totals, left over and percents, with no sideways scroll", async ({ page }) => {
  await fillPlain(page);
  await expect(card(page)).toContainText("$700.00");
  await expect(card(page)).toContainText("$3,000.00");
  await expect(card(page)).toContainText("$2,300.00");
  const where = page.getByRole("region", { name: "Where it goes" });
  await expect(where).toContainText("40.0% of income");
  await expect(where).toContainText("15.0% of income");
  await expect(where).toContainText("10.0% of income");
  await expect(where).toContainText("8.3% of income");
  await expect(where).toContainText("3.3% of income");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("monthly-budget-phone.png"), fullPage: true });
});

test("a negative left over shows a minus sign, and a new line can be added", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1,000");
  await page.getByLabel("Rent or mortgage, per month").fill("1,100");
  await page.getByRole("button", { name: "Add a spending item" }).click();
  await page.getByLabel("Name of spending item 6").fill("Phone");
  await page.getByLabel("Phone, per month").fill("40.50");
  await expect(card(page)).toContainText("-$140.50");
  await page.getByText("See all the numbers", { exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
});

test("messy typing shows a calm error that names the line", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3000");
  await page.getByLabel("Food, per month").fill("lots of money");
  await expect(page.getByText("Food: use a dollar amount")).toBeVisible();
  await expect(card(page)).toContainText("Type your pay to start.");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Food, per month").fill("1e3");
  await expect(page.getByText("Food: use a dollar amount")).toBeVisible();
  await page.getByLabel("Food, per month").fill(" 1,000.50 ");
  await expect(card(page)).toContainText("$1,999.50");
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(12);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const see = page.locator(".nt-see-btn");
  expect(await see.count()).toBe(1);
  expect((await see.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // The remove icons (one per row) and the two "Add ..." buttons.
  const buttons = page.locator(".nt-budget-remove, .nt-budget-list .nt-more-btn");
  expect(await buttons.count()).toBe(8);
  for (let i = 0; i < (await buttons.count()); i++) {
    const box = await buttons.nth(i).evaluate((el) => { const r = el.getBoundingClientRect(); return { h: r.height, w: r.width }; });
    expect(box.h).toBeGreaterThanOrEqual(44);
  }
  const icons = page.locator(".nt-budget-remove");
  for (let i = 0; i < (await icons.count()); i++) {
    const w = await icons.nth(i).evaluate((el) => el.getBoundingClientRect().width);
    expect(w).toBeGreaterThanOrEqual(44);
  }
});

test("No thanks hides the prompt and leaves the amounts blank", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1200");
  await page.goto("about:blank");
  await page.goto("#/tools/monthly-budget");
  await expect(page.getByText("Use your last numbers?")).toBeVisible();
  await expect(page.getByLabel("Pay, per month")).toHaveValue("");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByLabel("Pay, per month")).toHaveValue("");
  await expect(card(page)).toContainText("Type your pay to start.");
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("1200");
  await page.getByLabel("Food, per month").fill("200");
  await expect(card(page)).toContainText("$1,000.00");
  await page.goto("about:blank");
  await page.goto("#/tools/monthly-budget");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Pay, per month")).toHaveValue("1200");
  await expect(card(page)).toContainText("$1,000.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillPlain(page);
  await expect(card(page)).toContainText("$700.00");
  await page.screenshot({ path: shotPath("monthly-budget-desktop.png"), fullPage: true });
});

test("Remove is an icon labeled with the line name, asks first, and Put it back restores the line", async ({ page }) => {
  await page.getByLabel("Pay, per month").fill("3,000");
  await page.getByLabel("Food, per month").fill("450");
  await page.getByRole("button", { name: "Remove Food" }).click();
  // It asks first: nothing is gone yet.
  await expect(page.getByLabel("Food, per month")).toHaveValue("450");
  await page.getByRole("button", { name: "Yes, remove it" }).click();
  await expect(page.getByLabel("Food, per month")).toHaveCount(0);
  await expect(card(page)).toContainText("$3,000.00");
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByLabel("Food, per month")).toHaveValue("450");
  await expect(card(page)).toContainText("$2,550.00");
});
