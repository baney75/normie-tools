import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";

// The golden answers come from tools/unit-converter/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/unit-converter");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("What are you measuring?")).toBeVisible();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Unit Converter" })).toBeVisible();
  await expect(page.getByText("Type a number in the box")).toBeVisible();
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
});

test("gives the exact answer, with no sideways scroll", async ({ page }) => {
  await page.getByLabel("Number").fill("1");
  const card = page.getByLabel("Your answer");
  await expect(card).toContainText("25.4 mm");
  await page.getByLabel("Change from").selectOption("mile");
  await page.getByLabel("Change to").selectOption("kilometer");
  await expect(card).toContainText("1.60934 km");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("unit-converter-phone.png"), fullPage: true });
});

test("temperature, swap and a minus sign", async ({ page }) => {
  await page.getByLabel("What are you measuring?").selectOption("temperature");
  await page.getByLabel("Number").fill("98.6");
  await expect(page.getByLabel("Your answer")).toContainText("37");
  await page.getByRole("button", { name: "Swap the two" }).click();
  await expect(page.getByLabel("Your answer")).toContainText("209.48");
  await page.getByLabel("Number").fill("-40");
  await expect(page.getByLabel("Your answer")).toContainText("-40");
});

test("cooking measures give the exact gallon parts", async ({ page }) => {
  await page.getByLabel("What are you measuring?").selectOption("volume");
  await page.getByLabel("Change from").selectOption("gallon");
  await page.getByLabel("Change to").selectOption("cup");
  await page.getByLabel("Number").fill("1");
  await expect(page.getByLabel("Your answer")).toContainText("16 cup");
  await page.getByLabel("Change from").selectOption("cup");
  await page.getByLabel("Change to").selectOption("milliliter");
  await expect(page.getByLabel("Your answer")).toContainText("236.588 mL");
});

test("messy typing shows a calm error that names the field", async ({ page }) => {
  await page.getByLabel("Number").fill("lots of inches");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toBeVisible();
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Number").fill("1e3");
  await expect(page.getByText("Number: use digits like 12 or 3.5")).toBeVisible();
  await page.getByLabel("Number").fill(" 1,000 ");
  await expect(page.getByLabel("Your answer")).toContainText("25,400 mm");
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input, .nt-unit-select, .nt-unit-swap");
  const n = await boxes.count();
  expect(n).toBe(5);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
});

test("numbers come back after leaving", async ({ page }) => {
  await page.getByLabel("Number").fill("12");
  await expect(page.getByLabel("Your answer")).toContainText("304.8 mm");
  await page.goto("about:blank");
  await page.goto("/#/tools/unit-converter");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Number")).toHaveValue("12");
  await expect(page.getByLabel("Your answer")).toContainText("304.8 mm");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByLabel("What are you measuring?").selectOption("speed");
  await page.getByLabel("Number").fill("60");
  await expect(page.getByLabel("Your answer")).toContainText("96.5606 km/h");
  await page.screenshot({ path: shotPath("unit-converter-desktop.png"), fullPage: true });
});
