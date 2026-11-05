import { expect, test, type Page } from "@playwright/test";
import { shotPath } from "./paths";

// Answers worked out apart from the code: tools/form-filler/tests/golden.json (sheet "guided-full").
test.use({ viewport: { width: 390, height: 844 } });

const next = (page: Page) => page.getByRole("button", { name: "Next" }).click();
const noSideScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

async function questions(page: Page) {
  for (const a of ["Yes", "Yes", "Not sure", "No"]) {
    await page.getByLabel(a, { exact: true }).check();
    await next(page);
  }
}

async function info(page: Page, upTo = 8) {
  const boxes: [string, string][] = [
    ["First name", "Ana"], ["Last name", "Rivera"], ["Street address", "12 Example Street"], ["City", "Springfield"],
    ["State", "IL"], ["ZIP code", "62701"], ["Birth date", "1960-02-29"], ["Phone number", "(555) 010-1234"],
  ];
  for (const [label, value] of boxes.slice(0, upTo)) {
    const box = page.getByLabel(label, { exact: true });
    if (label === "State") await box.selectOption(value);
    else await box.fill(value);
    await next(page);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Make sure saving uses the plain download path in this test browser.
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.goto("/#/tools/form-filler");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("the first screen asks one question with one main button", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Form Filler" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4: Is this for you?")).toBeVisible();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await expect(page.getByLabel("Yes", { exact: true })).toBeFocused();
  await expect(page.locator("button.primary")).toHaveCount(1);
  await expect(page.getByText("Nothing is sent.")).toBeVisible();
  await noSideScroll(page);
});

test("the four questions end in the free way that fits, with the official link", async ({ page }) => {
  await questions(page);
  const card = page.getByLabel("Which free way may fit");
  await expect(card).toContainText("Guided Free File");
  await expect(card).toContainText("Check IRS.gov for this year's limit");
  await expect(page.getByRole("link", { name: "Open IRS.gov/freefile" })).toHaveAttribute("href", "https://www.irs.gov/freefile");
  await expect(page.getByText(/800-906-9887/)).toBeVisible();
  await noSideScroll(page);
});

test("the papers list ticks off and the info boxes come one per screen", async ({ page }) => {
  await questions(page);
  await next(page);
  await expect(page.getByText("Step 2 of 4: Gather your papers")).toBeVisible();
  await page.getByLabel(/^W-2 from each job/).check();
  await noSideScroll(page);
  await next(page);
  await expect(page.getByText("Step 3 of 4: My info")).toBeVisible();
  await expect(page.getByText("Box 1 of 8")).toBeVisible();
  await expect(page.getByLabel("First name")).toBeFocused();
  await expect(page.getByText(/You type your Social Security number yourself on the IRS partner site/)).toBeVisible();
  await expect(page.getByLabel(/social security/i)).toHaveCount(0);
  const info1 = await page.getByLabel("First name").evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
  expect(info1.h).toBeGreaterThanOrEqual(44);
  expect(info1.f).toBeGreaterThanOrEqual(16);
});

test("a bad ZIP shows a calm note and holds the screen", async ({ page }) => {
  await questions(page);
  await next(page);
  await next(page);
  await info(page, 5);
  await page.getByLabel("ZIP code").fill("12");
  await next(page);
  await expect(page.getByText(/ZIP code: type 5 numbers, like 12345\./)).toBeVisible();
  await expect(page.getByText("Box 6 of 8")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
});

test("the review shows every answer, saves the sheet as a download, and never submits", async ({ page }) => {
  await questions(page);
  await next(page);
  await next(page);
  await info(page);
  await expect(page.getByText("Step 4 of 4: Review")).toBeVisible();
  for (const t of ["Ana", "Rivera", "12 Example Street", "Springfield", "IL", "62701", "02/29/1960", "555-010-1234"]) {
    await expect(page.getByText(t, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Press Submit.", { exact: true })).toBeVisible();
  await expect(page.locator("button.primary")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Save my answer sheet" })).toHaveClass(/primary/);
  await noSideScroll(page);
  await page.screenshot({ path: shotPath("form-filler-phone.png"), fullPage: true });

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Save my answer sheet" }).click()]);
  expect(download.suggestedFilename()).toBe("form-filler-answer-sheet.txt");
  const text = (await (await import("node:fs/promises")).readFile((await download.path())!, "utf8"));
  expect(text).toContain("Birth date: 02/29/1960");
  expect(text).toContain("Phone number: 555-010-1234");
  expect(text).toContain("Guided Free File");
  expect(text).toContain("You type your Social Security number yourself on the IRS partner site.");
  await expect(page.getByText(/Saved as form-filler-answer-sheet\.txt\. To undo, delete that file/)).toBeVisible();
});

test("Edit goes to one box and Next comes straight back to the review", async ({ page }) => {
  await questions(page);
  await next(page);
  await next(page);
  await info(page);
  await page.getByRole("link", { name: "Edit City" }).click();
  await expect(page.getByText("Box 4 of 8")).toBeVisible();
  await page.getByLabel("City").fill("Dayton");
  await next(page);
  await expect(page.getByRole("heading", { name: "Look it over" })).toBeVisible();
  await expect(page.getByText("Dayton", { exact: true })).toBeVisible();
});

test("the screen and answers stay when the phone turns, and come back after leaving", async ({ page }) => {
  await questions(page);
  await next(page);
  await next(page);
  await page.getByLabel("First name").fill("Ana");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByText("Step 3 of 4: My info")).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveValue("Ana");
  await noSideScroll(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await next(page);
  await page.goto("about:blank");
  await page.goto("/#/tools/form-filler");
  await expect(page.getByText(/You were on Step 3 of 4: My info\./)).toBeVisible();
  await page.getByRole("button", { name: "Pick up" }).click();
  await expect(page.getByText("Step 3 of 4: My info")).toBeVisible();
  await expect(page.getByText("Box 2 of 8")).toBeVisible();
});

test("saved answers open after a look, and the old answers can be put back", async ({ page }) => {
  await page.getByText("Have saved answers?").click();
  const saved = {
    format: "nt-form-filler", version: 1,
    answers: { filing: "yes", income: "no", fillable: "yes", open: "yes" },
    info: { firstName: "Sam", lastName: "Lee" }, papers: ["w2"],
  };
  await page.getByLabel("Open my saved answers").setInputFiles({ name: "mine.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(saved)) });
  await expect(page.getByText(/Found saved answers/)).toBeVisible();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Use these answers" }).click();
  await expect(page.getByRole("heading", { name: "Look it over" })).toBeVisible();
  await expect(page.getByText("Sam", { exact: true })).toBeVisible();
  await expect(page.getByText("Free File Fillable Forms").first()).toBeVisible();
  await page.getByRole("button", { name: "Put my old answers back" }).click();
  await expect(page.getByText("Sam", { exact: true })).toHaveCount(0);
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await questions(page);
  await next(page);
  await next(page);
  await info(page);
  await expect(page.getByRole("heading", { name: "Look it over" })).toBeVisible();
  await page.screenshot({ path: shotPath("form-filler-desktop.png"), fullPage: true });
});
