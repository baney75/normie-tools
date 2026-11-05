import { expect, test } from "@playwright/test";
import { shotPath } from "./paths";
import { isShipped } from "./shipped";

// This tool is coming soon until its review clears, so its page is not on the site. The spec runs again when it ships.
test.beforeEach(() => {
  test.skip(!isShipped("morning-briefing"), "coming soon");
});

// Weather and news are made-up Example lines. The golden text is in tools/morning-briefing/tests/golden.json.
test.use({ viewport: { width: 390, height: 844 } });

async function typeDay(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Time of thing 1").fill("1pm");
  await page.getByLabel("Name of thing 1").fill("Lunch");
  await page.getByRole("button", { name: "Add a thing to my day" }).click();
  await page.getByLabel("Time of thing 2").fill("7:30 am");
  await page.getByLabel("Name of thing 2").fill("Pills");
  await page.getByRole("button", { name: "Add a thing to my day" }).click();
  await page.getByLabel("Time of thing 3").fill("later");
  await page.getByLabel("Name of thing 3").fill("Call Sam");
  await page.getByLabel("Reminder 1", { exact: true }).fill("Water the plants");
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/tools/morning-briefing");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Step 1 of 3: Pick what to include")).toBeVisible();
});

test("step 1 has four ticked parts and one next action", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Morning Briefing" })).toBeVisible();
  await expect(page.getByLabel("Weather (Example only)")).toBeChecked();
  await expect(page.locator("button.primary")).toHaveCount(1);
  await page.getByLabel("My day").uncheck();
  await page.getByLabel("My reminders").uncheck();
  await page.getByLabel("Weather (Example only)").uncheck();
  await page.getByLabel("News headlines (Example only)").uncheck();
  await expect(page.getByText("Pick at least one part to go on.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
});

test("builds a briefing in time order with Example parts marked, no sideways scroll", async ({ page }) => {
  await typeDay(page);
  await expect(page.getByText("We are not sure about this time.")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 3 of 3: Your briefing")).toBeVisible();
  const paper = page.getByLabel("Your briefing");
  await expect(paper).toContainText("Example town: 58 degrees, clear.");
  await expect(paper).toContainText("Example. Not today's weather.");
  await expect(paper).toContainText("Live weather and news are not on this page yet.");
  await expect(paper.getByLabel("My day")).toContainText(/7:30 am: Pills\s*1:00 pm: Lunch\s*Time not clear\s*later: Call Sam/);
  await expect(page.getByText("Save or print my briefing")).toBeVisible();
  await expect(page.locator(".nt-sheet-primary")).toHaveCount(1);
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
  await page.screenshot({ path: shotPath("morning-briefing-phone.png"), fullPage: true });
});

test("messy typing is calm and Remove can be undone", async ({ page }) => {
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Time of thing 1").fill("25:99 pm??");
  await page.getByLabel("Name of thing 1").fill("\u{1F600} NaN");
  await expect(page.getByText("We are not sure about this time.")).toBeVisible();
  await page.getByRole("button", { name: "Remove thing 1" }).click();
  await expect(page.getByLabel("Name of thing 1")).toHaveCount(0);
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByLabel("Name of thing 1")).toHaveValue("\u{1F600} NaN");
});

test("tap targets are 44px or more and text is 16px or more", async ({ page }) => {
  await page.getByRole("button", { name: "Next" }).click();
  const boxes = page.locator(".nt-field-input");
  const n = await boxes.count();
  expect(n).toBe(3);
  for (let i = 0; i < n; i++) {
    const info = await boxes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h).toBeGreaterThanOrEqual(44);
    expect(info.f).toBeGreaterThanOrEqual(16);
  }
  const buttons = page.locator(".nt-mb-small, .nt-mb-nav button");
  for (let i = 0; i < (await buttons.count()); i++) {
    expect(await buttons.nth(i).evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
});

test("choices come back after leaving", async ({ page }) => {
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Reminder 1", { exact: true }).fill("Call Sam");
  await page.goto("about:blank");
  await page.goto("#/tools/morning-briefing");
  await page.getByRole("button", { name: "Use them" }).click();
  await expect(page.getByLabel("Reminder 1", { exact: true })).toHaveValue("Call Sam");
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await typeDay(page);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Your briefing")).toContainText("Pills");
  await page.screenshot({ path: shotPath("morning-briefing-desktop.png"), fullPage: true });
});
