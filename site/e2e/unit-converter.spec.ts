import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { expectAnsweredButtons, expectSeeHiddenWhenWide, expectTrustLine, expectWaitingButtons, openMoreOptions } from "./answer-first";

// The golden answers come from tools/unit-converter/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/unit-converter");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Number")).toBeVisible();
});

// What you are measuring is chips now: Length, Weight, Volume, Temperature, Speed. Picking one sets its usual from and to.
const pick = (page: import("@playwright/test").Page, kind: string) => page.getByLabel(kind, { exact: true }).check();
const card = (page: import("@playwright/test").Page) => page.getByLabel("Your answer", { exact: true });

test("opens with Length picked, an empty number, the waiting text and one main button that leads to the number", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Change cups, inches, pounds and more" })).toBeVisible();
  await expect(page.getByText("Unit Converter", { exact: true })).toBeVisible();
  await expectTrustLine(page);
  for (const kind of ["Length", "Weight", "Volume", "Temperature", "Speed"]) {
    await expect(page.getByLabel(kind, { exact: true })).toHaveCount(1);
  }
  await expect(page.getByLabel("Length", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Number")).toHaveValue("");
  await expect(page.getByLabel("Change from")).toHaveValue("inch");
  await expect(page.getByLabel("Change to")).toHaveValue("millimeter");
  await expect(card(page)).toContainText("Type a number to see your answer.");
  await expect(card(page)).not.toContainText("Example");
  await expect(page.getByRole("button", { name: "Type my own number" })).toHaveCount(0);
  await expectWaitingButtons(page, "See my answer", "Number");
});

test("with an answer, Done is the one filled button, See my answer is gone, and Print or save opens the sheet", async ({ page }) => {
  await page.getByLabel("Number").fill("12");
  await expect(card(page)).toContainText("304.8 millimeters");
  await expectAnsweredButtons(page, "See my answer", "answer");
  await expectSeeHiddenWhenWide(page, "See my answer");
});

test("Start over, Clear the boxes empties the number and shows the waiting text", async ({ page }) => {
  await page.getByLabel("Number").fill("2");
  await openMoreOptions(page);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear the boxes" }).click();
  await expect(page.getByLabel("Number")).toHaveValue("");
  await expect(card(page)).toContainText("Type a number to see your answer.");
});

test("gives the exact answer, with no sideways scroll", async ({ page }) => {
  await pick(page, "Length");
  await page.getByLabel("Number").fill("1");
  await expect(card(page)).toContainText("25.4 millimeters");
  await page.getByLabel("Change from").selectOption("mile");
  await page.getByLabel("Change to").selectOption("kilometer");
  await expect(card(page)).toContainText("1.60934 kilometers");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("unit-converter-phone.png"), fullPage: true });
});

test("temperature, swap and a minus sign", async ({ page }) => {
  await pick(page, "Temperature");
  await page.getByLabel("Number").fill("98.6");
  await expect(card(page)).toContainText("37");
  await page.getByRole("button", { name: "Swap" }).click();
  await expect(card(page)).toContainText("209.48");
  await page.getByLabel("Number").fill("-40");
  await expect(card(page)).toContainText("-40");
});

test("cooking measures give the exact gallon parts", async ({ page }) => {
  await pick(page, "Volume");
  await page.getByLabel("Change from").selectOption("gallon");
  await page.getByLabel("Change to").selectOption("cup");
  await page.getByLabel("Number").fill("1");
  await expect(card(page)).toContainText("16 US cups");
  await page.getByLabel("Change from").selectOption("cup");
  await page.getByLabel("Change to").selectOption("milliliter");
  await expect(card(page)).toContainText("236.588 milliliters");
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await pick(page, "Length");
  await page.getByLabel("Number").fill("lots of inches");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toBeVisible();
  await expect(card(page)).toContainText("Type a number to see your answer.");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Number").fill("1e3");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toBeVisible();
  await page.getByLabel("Number").fill(" 1,000 ");
  await expect(card(page)).toContainText("25,400 millimeters");
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input, .nt-unit-select, .nt-unit-swap, .nt-chip");
  const n = await boxes.count();
  // The number, two lists, Swap, and five category chips.
  expect(n).toBe(9);
  const see = page.locator(".nt-see-btn");
  expect(await see.count()).toBe(1);
  expect((await see.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("No thanks hides the prompt and leaves the number blank", async ({ page }) => {
  await page.getByLabel("Number").fill("12");
  await page.goto("about:blank");
  await page.goto("#/tools/unit-converter");
  await expect(page.getByText("Use your last numbers?")).toBeVisible();
  await expect(page.getByLabel("Number")).toHaveValue("");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.getByLabel("Number")).toHaveValue("");
  await expect(card(page)).toContainText("Type a number to see your answer.");
});

test("numbers come back after leaving", async ({ page }) => {
  await pick(page, "Length");
  await page.getByLabel("Number").fill("12");
  await expect(card(page)).toContainText("304.8 millimeters");
  await page.goto("about:blank");
  await page.goto("#/tools/unit-converter");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Number")).toHaveValue("12");
  await expect(card(page)).toContainText("304.8 millimeters");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await pick(page, "Speed");
  await page.getByLabel("Number").fill("60");
  await expect(card(page)).toContainText("96.5606 kilometers per hour");
  await page.screenshot({ path: shotPath("unit-converter-desktop.png"), fullPage: true });
});
