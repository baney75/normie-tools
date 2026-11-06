import { expect, test, type Locator, type Page } from "@playwright/test";
import { TOURS } from "./walk";

// One question per phone screen. At 390 by 664 (an iPhone in Safari with its bars showing), every question screen of every
// shipped tool fits with no scrolling and its Continue button is fully on screen, and the answer screen shows "I'm done"
// without scrolling. Each tool is walked with real values (walk.ts TOURS) and checked at every screen, before and after the step is filled.
const WIDTH = 390;
const HEIGHT = 664;
test.use({ viewport: { width: WIDTH, height: HEIGHT } });

async function expectFullyOnScreen(target: Locator, what: string) {
  await expect(target, `${what} shows`).toBeVisible();
  const box = await target.boundingBox();
  expect(box, `${what} has a box`).not.toBeNull();
  expect(box!.y, `${what} top is on screen`).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, `${what} bottom is on screen (viewport ${HEIGHT} high)`).toBeLessThanOrEqual(HEIGHT);
  expect(box!.x, `${what} left is on screen`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${what} right is on screen`).toBeLessThanOrEqual(WIDTH);
}

async function expectNoScrolling(page: Page, what: string) {
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, y: window.scrollY, wide: document.documentElement.scrollWidth > window.innerWidth }));
  expect(m.height, `${what}: the page is ${m.height}px high, the screen is ${HEIGHT}px`).toBeLessThanOrEqual(HEIGHT);
  expect(m.y, `${what}: the page is scrolled`).toBe(0);
  expect(m.wide, `${what}: sideways scroll`).toBe(false);
}

for (const tour of TOURS) {
  test(`${tour.id}: every question screen fits 390 by 664 and the answer screen shows I'm done`, async ({ page }) => {
    await page.goto(`#/tools/${tour.id}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByLabel(tour.firstBox).first()).toBeVisible();
    let questions = 0;
    await tour.run(page, async (screen) => {
      const what = `${tour.id} ${screen}`;
      if (screen === "answer") {
        await expect(page.locator(".nt-flow-answer"), `${what} is the answer screen`).toBeVisible();
        await expectFullyOnScreen(page.getByRole("link", { name: "I'm done", exact: true }), `${what}: I'm done`);
        await expect(page.locator(".nt-flow-count"), `${what} is the last step`).toHaveText(`Step ${tour.steps + 1} of ${tour.steps + 1}: your answer`);
        await expect(page.locator(".nt-flow-next")).toHaveCount(0);
        return;
      }
      questions++;
      await expect(page.locator(".nt-flow-count"), `${what} is a question screen`).toContainText(`Step ${screen.split(" ")[1]} of ${tour.steps + 1}`);
      await expectNoScrolling(page, what);
      await expectFullyOnScreen(page.locator(".nt-flow-next"), `${what}: Continue`);
    });
    // Every step was seen, before and after it was filled.
    expect(questions).toBe(tour.steps * 2);
  });
}

// A saved copy with blank boxes opens a resume screen in place of step 1: "Use your last numbers?" with "Use them" and "No thanks".
// It must fit one screen with both buttons fully visible, and "No thanks" must then show step 1, which fits too.
for (const tour of TOURS) {
  test(`${tour.id}: the resume screen fits 390 by 664 with both buttons visible`, async ({ page }) => {
    await page.goto(`#/tools/${tour.id}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByLabel(tour.firstBox).first()).toBeVisible();
    // Leave a saved copy: walk the whole tool, then come back fresh.
    await tour.run(page, async () => {});
    await page.goto("about:blank");
    await page.goto(`#/tools/${tour.id}`);
    const what = `${tour.id} resume screen`;
    await expect(page.getByRole("heading", { level: 1, name: "Use your last numbers?", exact: true })).toBeVisible();
    await expectNoScrolling(page, what);
    await expectFullyOnScreen(page.getByRole("button", { name: "Use them", exact: true }), `${what}: Use them`);
    await expectFullyOnScreen(page.getByRole("button", { name: "No thanks", exact: true }), `${what}: No thanks`);
    await page.getByRole("button", { name: "No thanks", exact: true }).click();
    await expect(page.locator(".nt-flow-count")).toHaveText(`Step 1 of ${tour.steps + 1}`);
    await expectNoScrolling(page, `${tour.id} step 1 after No thanks`);
    await expectFullyOnScreen(page.locator(".nt-flow-next"), `${tour.id} step 1 after No thanks: Continue`);
  });
}
