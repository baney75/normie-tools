import { expect, test, type Page } from "@playwright/test";
import { shotPath } from "./paths";
import { isShipped } from "./shipped";

// This tool is coming soon until its review clears, so its page is not on the site. The spec runs again when it ships.
test.beforeEach(() => {
  test.skip(!isShipped("tax-filing-helper"), "coming soon");
});

// The answers come from tools/tax-filing-helper/tests/golden.json (worked out apart from the code).
test.use({ viewport: { width: 390, height: 844 } });

const ANSWERS: [string, string][][] = [
  [["First name", "Sample"], ["Last name", "Person"], ["Email", "sample.person@example.com"]],
  [["Employer name", "Example Bakery"], ["Pay for the year", "$32,450"], ["Tax already taken out of your pay", "2810.5"]],
  [["Bank name", "example credit union"], ["Interest from your bank", "12.34"]],
];

async function toReview(page: Page, overrides: Record<string, string> = {}) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (let s = 0; s < ANSWERS.length; s++) {
    for (const [label, text] of ANSWERS[s]) await page.getByLabel(label, { exact: true }).fill(overrides[label] ?? text);
    await page.getByRole("button", { name: s < 2 ? "Next screen" : "Next: the practice review page" }).click();
  }
}

const noSideScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/tax-filing-helper");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Step 1 of 4: Pick your way")).toBeVisible();
});

test("step 1 shows the practice banner, both ways and who does what", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Tax Filing Helper" })).toBeVisible();
  await expect(page.getByText("Practice only. Use the made-up answers shown. Nothing is filed.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Guided Free File/ })).toBeFocused();
  await expect(page.getByRole("region", { name: "Who does what" })).toContainText("Press Submit");
  await noSideScroll(page);
});

test("copy the answers in one screen at a time, then stop on the review page", async ({ page }) => {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 2 of 4: Your answer sheet")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 3 of 4: Copy the answers in")).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (let s = 0; s < ANSWERS.length; s++) {
    for (const [label, text] of ANSWERS[s]) await page.getByLabel(label, { exact: true }).fill(text);
    await page.getByRole("button", { name: s < 2 ? "Next screen" : "Next: the practice review page" }).click();
  }
  await expect(page.getByText("Step 4 of 4: Check your answers")).toBeVisible();
  await expect(page.getByLabel("Practice check")).toContainText("All 8 answers match.");
  await expect(page.getByText("You stop here. The real filing is on IRS.gov when Free File opens. You can keep a copy of this check.")).toBeVisible();
  // The helper stops: nothing on this page can submit.
  expect(await page.locator("form").count()).toBe(0);
  expect(await page.locator('input[type="submit"], button[type="submit"]').count()).toBe(0);
  for (const b of await page.getByRole("button").all()) expect(await b.innerText()).not.toMatch(/submit|file|send|pay|sign/i);
  await expect(page.getByRole("region", { name: "Watch out for these" })).toContainText("Extra charges");
  await noSideScroll(page);
  await page.screenshot({ path: shotPath("tax-filing-helper-phone.png"), fullPage: true });
});

test("a different answer is named on the review page", async ({ page }) => {
  await toReview(page, { "Interest from your bank": "12.3", "Last name": "" });
  await expect(page.getByLabel("Practice check")).toContainText("6 of 8 answers match. 2 need a look.");
  const rows = page.getByRole("region", { name: "Your answers next to what you typed" });
  await expect(rows).toContainText("Answer sheet: $12.34");
  await expect(rows).toContainText("You typed: 12.3");
  await expect(rows).toContainText("Not typed");
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const boxes = page.locator(".nt-field-input");
  for (let i = 0; i < (await boxes.count()); i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const buttons = page.locator(".nt-tfh-btn");
  for (let i = 0; i < (await buttons.count()); i++) {
    expect(await buttons.nth(i).evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
});

test("typing comes back after leaving", async ({ page }) => {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Sample");
  await page.goto("about:blank");
  await page.goto("/#/tools/tax-filing-helper");
  await page.getByRole("button", { name: "Pick up" }).click();
  await expect(page.getByText("Step 3 of 4: Copy the answers in")).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Sample");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await toReview(page);
  await expect(page.getByLabel("Practice check")).toContainText("All 8 answers match.");
  await page.screenshot({ path: shotPath("tax-filing-helper-desktop.png"), fullPage: true });
});
