import { expect, type Page } from "@playwright/test";

// Checks every calculator shares. Each tool is a short flow: one question per screen, Continue at the bottom, then the answer.
// Here: walking the steps, the trust line, Done, Print or save, and which button is filled.

/** The line under the h1 on step 1: a lock and one link to the page that explains how numbers stay private. */
export async function expectTrustLine(page: Page) {
  // Under the heading, with no claim sentence (Haiku failed "Your numbers stay on this phone or computer." under rule 8).
  // The change line sits in the bottom nav above Continue.
  const line = page.locator(".nt-flow-question + .nt-tool-trust");
  await expect(line).toHaveCount(1);
  await expect(line).toHaveText("How this page handles your numbers");
  await expect(line.locator("svg.nt-lock")).toHaveCount(1);
  const link = line.getByRole("link", { name: "How this page handles your numbers" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "#/private");
  const nav = page.locator(".nt-flow-nav");
  await expect(nav.getByText("You can go back and change any number.", { exact: true })).toBeVisible();
  await expect(nav.locator(".nt-tool-trust")).toHaveCount(0);
}

/** Start over waits inside a closed "More options" box. Open it so the button can be clicked. */
export async function openMoreOptions(page: Page) {
  const more = page.locator("details.nt-more");
  await expect(more.locator("summary")).toHaveText("More options");
  // A box that is already open stays open, so a second call does not shut it.
  if (!(await more.evaluate((el) => (el as HTMLDetailsElement).open))) await more.locator("summary").click();
  await expect(more).toHaveJSProperty("open", true);
}

/** The Continue button at the bottom of a question step. On the last step it carries the tool's own words. */
export const nextButton = (page: Page) => page.locator(".nt-flow-next");

/** Tap Continue (or, on the last step, the tool's own button, like "See my answer"). */
export async function next(page: Page, label = "Continue") {
  await page.getByRole("button", { name: label, exact: true }).click();
}

/** The screen is question number n of total, with the question as its heading and a progress bar to match. */
export async function expectOnStep(page: Page, n: number, total: number, question: string) {
  await expect(page.getByRole("heading", { level: 1, name: question, exact: true })).toBeVisible();
  await expect(page.locator(".nt-flow-count")).toHaveText(`Step ${n} of ${total + 1}`);
  const bar = page.getByRole("progressbar", { name: `Step ${n} of ${total + 1} progress` });
  await expect(bar).toHaveAttribute("value", String(n));
  await expect(bar).toHaveAttribute("max", String(total + 1));
}

/** Tap Continue until the answer screen shows. Every step must already be ready. */
export async function continueToAnswer(page: Page) {
  for (let i = 0; i < 8; i++) {
    if ((await page.locator(".nt-flow-answer").count()) > 0) return;
    const count = page.locator(".nt-flow-count");
    const was = await count.textContent();
    await nextButton(page).click();
    await expect(page.locator(".nt-flow-answer").or(count.filter({ hasNotText: was ?? "" })).first()).toBeVisible();
  }
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
}

/** The answer is the last step: "Step 4 of 4: your answer" on a tool with three questions, with the progress bar full. */
export async function expectOnAnswer(page: Page, questions: number) {
  const last = questions + 1;
  await expect(page.locator(".nt-flow-answer")).toBeVisible();
  await expect(page.locator(".nt-flow-count")).toHaveText(`Step ${last} of ${last}: your answer`);
  const bar = page.getByRole("progressbar", { name: `Step ${last} of ${last} progress` });
  await expect(bar).toHaveAttribute("value", String(last));
  await expect(bar).toHaveAttribute("max", String(last));
}

/** On the answer screen: "Change my numbers" goes back to step 1 with every box still filled. */
/** "Change my numbers" opens the first step that still needs something (step 1 when every step is filled). */
export async function changeNumbers(page: Page, total: number, landsOn = 1) {
  const change = page.getByRole("button", { name: "Change my numbers", exact: true });
  await expect(change).toBeVisible();
  await expect(change).not.toHaveClass(/primary/);
  await change.click();
  await expect(page.locator(".nt-flow-count")).toHaveText(`Step ${landsOn} of ${total + 1}`);
}

/** From the answer screen, go back to question number n (1 is the first). */
export async function reopenStep(page: Page, n: number, total: number) {
  await changeNumbers(page, total);
  for (let i = 1; i < n; i++) {
    await nextButton(page).click();
    await expect(page.locator(".nt-flow-count")).toHaveText(`Step ${i + 1} of ${total + 1}`);
  }
}

/** Put a saved copy in the browser, like one left by an earlier visit. Reload to see the "Use your last numbers?" prompt. */
export async function seedSaved(page: Page, id: string, step: number, value: unknown) {
  await page.evaluate(([key, saved]) => localStorage.setItem(key, JSON.stringify(saved)), [
    `nt:flow:${id}`,
    { v: 1, step, value, at: new Date().toISOString() },
  ] as const);
}

/**
 * Step 1 opens with nothing typed: the heading is the question, Continue is the one filled button, "Back to tools"
 * goes home, and no answer button shows. Tapping Continue too soon shows the step's plain line and puts the cursor in the box.
 */
export async function expectFirstStepWaiting(page: Page, opts: { total: number; question: string; firstBox: string; missing: string }) {
  await expectOnStep(page, 1, opts.total, opts.question);
  await expect(page.locator(".primary")).toHaveCount(1);
  const button = nextButton(page);
  await expect(button).toBeVisible();
  await expect(button).toHaveText("Continue");
  await expect(button).toHaveClass(/primary/);
  const back = page.getByRole("link", { name: "Back to tools", exact: true });
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute("href", "#/");
  await expect(page.getByRole("link", { name: "I'm done", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
  await expect(page.getByLabel(opts.firstBox).first()).not.toBeFocused();
  await expectBlockedUntilReady(page, opts.missing, opts.firstBox);
}

/** Tapping Continue before the step is ready shows the step's one plain line, keeps the person here, and puts the cursor on the box. */
export async function expectBlockedUntilReady(page: Page, missing: string, box: string) {
  const count = await page.locator(".nt-flow-count").textContent();
  await nextButton(page).click();
  await expect(page.locator(".nt-flow-missing")).toHaveText(missing);
  await expect(page.locator(".nt-flow-count")).toHaveText(count ?? "");
  await expect(page.getByLabel(box).first()).toBeFocused();
}

/**
 * Every box, list and button on the screen that a finger or an eye must reach: boxes and chips 44px high with 16px text,
 * and the Continue button too. Returns how many boxes and chips were measured.
 */
export async function expectBigTargets(page: Page, selector: string): Promise<number> {
  const nodes = page.locator(selector);
  const n = await nodes.count();
  for (let i = 0; i < n; i++) {
    const info = await nodes.nth(i).evaluate((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) }));
    expect(info.h, `${selector} #${i} height`).toBeGreaterThanOrEqual(44);
    expect(info.f, `${selector} #${i} font size`).toBeGreaterThanOrEqual(16);
  }
  return n;
}

/** The step's Continue button is 44px high or more with 16px text, and so is every box and chip in `selector`. */
export async function expectStepTargets(page: Page, selector = ".nt-field-input, .nt-chip, .nt-unit-select, .nt-unit-swap"): Promise<number> {
  const n = await expectBigTargets(page, selector);
  await expectBigTargets(page, ".nt-flow-next");
  return n;
}

/** No sideways scroll. */
export async function expectNoSidewaysScroll(page: Page) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide).toBe(false);
}

/**
 * An answer is showing: the See button is gone, the line "That is your estimate." ("answer" for exact tools) sits under the card,
 * the Done link to the home page is the one filled element, and Print or save is an outline button
 * that opens a sheet with Print and Save a copy.
 */
export async function expectAnsweredButtons(page: Page, see: string, word: "estimate" | "answer" = "estimate") {
  await expect(page.getByRole("button", { name: see, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save or print" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Go up to my answer" })).toHaveCount(0);
  await expect(page.locator(".nt-finish-line")).toHaveText(`That is your ${word}. You can stop here.`);
  await expect(page.locator(".primary")).toHaveCount(1);
  const done = page.getByRole("link", { name: "I'm done", exact: true });
  await expect(done).toBeVisible();
  await expect(done).toHaveClass(/primary/);
  await expect(done).toHaveClass(/nt-finish-done/);
  await expect(done).toHaveAttribute("href", "#/");
  const save = page.getByRole("button", { name: "Print or save", exact: true });
  await expect(save).toBeVisible();
  await expect(save).not.toHaveClass(/primary/);
  // Start over sits inside a closed "More options" box: the box shows, the button waits until it is opened.
  await expect(page.locator("details.nt-more > summary")).toHaveText("More options");
  await expect(page.locator("details.nt-more")).toHaveJSProperty("open", false);
  await expect(page.getByRole("button", { name: "Start over" })).toBeHidden();
  await openMoreOptions(page);
  await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
  await expect(page.locator(".nt-startover-note")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Print or save", exact: true })).toHaveCount(0);
  await save.click();
  await expect(page.getByRole("heading", { name: "Print or save", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a copy" })).toBeVisible();
  // Opening the sheet does not add a second filled element.
  await expect(page.locator(".primary")).toHaveCount(1);
}

/**
 * A saved copy exists and the boxes are blank: a screen of its own opens in place of step 1. It shows the tool name, the question
 * "Use your last numbers?", one line of body text, "Use them" as the one filled button, and a quiet "No thanks". No box shows.
 */
export async function expectResumeScreen(page: Page, toolName: string) {
  await expect(page.getByRole("heading", { level: 1, name: "Use your last numbers?", exact: true })).toBeVisible();
  await expect(page.locator(".nt-tool-name")).toHaveText(toolName);
  await expect(page.locator(".nt-flow-resume")).toHaveText("You typed numbers here before. They are saved on this phone or computer.");
  const yes = page.getByRole("button", { name: "Use them", exact: true });
  await expect(yes).toBeVisible();
  await expect(yes).toHaveClass(/primary/);
  await expect(page.locator(".primary")).toHaveCount(1);
  const no = page.getByRole("button", { name: "No thanks", exact: true });
  await expect(no).toBeVisible();
  await expect(no).not.toHaveClass(/primary/);
  await expect(page.locator("input")).toHaveCount(0);
  await expect(page.locator(".nt-flow-count")).toHaveCount(0);
  await expect(page.locator("#nt-answer")).toHaveCount(0);
}

/** "No thanks" clears the saved copy and shows step 1. */
export async function expectNoSavedCopy(page: Page) {
  await expect(page.getByText("Use your last numbers?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use them" })).toHaveCount(0);
  await expect(page.locator(".nt-flow-count")).toHaveText(/^Step 1 of \d+$/);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("nt:flow:")))).toEqual([]);
}
