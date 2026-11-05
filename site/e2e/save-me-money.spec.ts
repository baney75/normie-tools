import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { isShipped } from "./shipped";

// This tool is coming soon until its review clears, so its page is not on the site. The spec runs again when it ships.
test.beforeEach(() => {
  test.skip(!isShipped("save-me-money"), "coming soon");
});

// The golden answers come from tools/save-me-money/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

async function fillPlain(page: import("@playwright/test").Page) {
  await page.getByLabel("Phone, amount").fill("65");
  await page.getByLabel("Internet, amount").fill("80");
  await page.getByLabel("Streaming, amount").fill("15.99");
  await page.getByLabel("Insurance, amount").fill("1,200");
  await page.getByLabel("Insurance, how often").selectOption("year");
  await page.getByLabel("Gym, amount").fill("10");
  await page.getByLabel("Gym, how often").selectOption("week");
  await page.getByLabel("Other, amount").fill("25");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/save-me-money");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Phone, amount")).toBeVisible();
});

test("shows an empty state that says what to type", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Save Me Money" })).toBeVisible();
  await expect(page.getByText("Type an amount on any line")).toBeVisible();
  await expect(page.getByLabel("Total for a year", { exact: true })).toContainText("Your total shows here");
  await expect(page.getByRole("heading", { name: "Your costs" })).toBeVisible();
  await expect(page.getByText("Remove takes out one cost. A Put it back button shows right after.").first()).toBeVisible();
  await expect(page.getByText("X Finder, Bill Negotiation Prep and Cheaper Plan Finder")).toBeHidden();
  await page.getByText("What comes next").click();
  await expect(page.getByText("Subscription Finder, Bill Negotiation Prep and Cheaper Plan Finder")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a copy" })).toBeDisabled();
});

test("gives exact totals, a biggest-first list and no sideways scroll", async ({ page }) => {
  await fillPlain(page);
  const card = page.getByLabel("Total for a year", { exact: true });
  await expect(card).toContainText("$3,951.88");
  await expect(card).toContainText("$329.32");
  await expect(page.getByRole("heading", { name: "Your list", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keep your list if you want" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(6);
  await expect(page.getByRole("checkbox").first()).toHaveAccessibleName("Insurance: $1,200.00 a year, $100.00 a month");
  await expect(page.getByRole("region", { name: "Your costs, biggest first" }).getByText("Gym: $520.00 a year, $43.33 a month")).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("save-me-money-phone.png"), fullPage: true });
});

test("ticking a cost shows the questions to ask before a call", async ({ page }) => {
  await fillPlain(page);
  const q = page.getByRole("region", { name: "Questions to ask before you call" });
  await expect(q).toContainText("Questions appear here");
  await page.getByRole("checkbox", { name: /^Gym:/ }).check();
  await expect(q).toContainText("For: Gym");
  await expect(q).toContainText("What is the price today?");
  await expect(q).toContainText("Can I stop this with no fee?");
});

test("removing a line can be undone", async ({ page }) => {
  await page.getByLabel("Gym, amount").fill("10");
  await page.getByRole("button", { name: "Remove Gym" }).click();
  await expect(page.getByLabel("Gym, amount")).toHaveCount(0);
  await page.getByRole("button", { name: "Put it back" }).first().click();
  await expect(page.getByLabel("Gym, amount")).toHaveValue("10");
});

test("messy typing shows a calm error that names the line", async ({ page }) => {
  await page.getByLabel("Phone, amount").fill("65");
  await page.getByLabel("Gym, amount").fill("lots of money");
  await expect(page.getByText("Gym: use a dollar amount")).toBeVisible();
  await expect(page.getByLabel("Total for a year", { exact: true })).toContainText("Your total shows here");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  await page.getByLabel("Gym, amount").fill("1e3");
  await expect(page.getByText("Gym: use a dollar amount")).toBeVisible();
  await page.getByLabel("Gym, how often").selectOption("week");
  await page.getByLabel("Gym, amount").fill(" 10.50 ");
  await expect(page.getByLabel("Total for a year", { exact: true })).toContainText("$1,326.00");
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  const boxes = page.locator(".nt-field-input, .nt-smm-select");
  const n = await boxes.count();
  expect(n).toBe(18);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const buttons = page.locator(".nt-smm-remove, .nt-smm-add");
  for (let i = 0; i < (await buttons.count()); i++) {
    const h = await buttons.nth(i).evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  }
});

test("costs come back after leaving", async ({ page }) => {
  await page.getByLabel("Phone, amount").fill("65");
  await expect(page.getByLabel("Total for a year", { exact: true })).toContainText("$780.00");
  await page.goto("about:blank");
  await page.goto("/#/tools/save-me-money");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Phone, amount")).toHaveValue("65");
  await expect(page.getByLabel("Total for a year", { exact: true })).toContainText("$780.00");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fillPlain(page);
  await expect(page.getByLabel("Total for a year", { exact: true })).toContainText("$3,951.88");
  await page.screenshot({ path: shotPath("save-me-money-desktop.png"), fullPage: true });
});
