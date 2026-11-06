import { expect, type Page } from "@playwright/test";

// Checks every calculator shares: the line under the heading, the "See ..." button, Done, Print or save, and which button is filled.

/** The line under the h1 and the link to the page that backs it up. */
export async function expectTrustLine(page: Page) {
  const line = page.locator(".nt-tool-trust");
  await expect(line).toContainText("Your numbers stay on this phone or computer.");
  const how = line.getByRole("link", { name: "How we know" });
  await expect(how).toBeVisible();
  await expect(how).toHaveAttribute("href", "#/private");
}

/** Start over waits inside a closed "More options" box. Open it so the button can be clicked. */
export async function openMoreOptions(page: Page) {
  const more = page.locator("details.nt-more");
  await expect(more.locator("summary")).toHaveText("More options");
  // A box that is already open stays open, so a second call does not shut it.
  if (!(await more.evaluate((el) => (el as HTMLDetailsElement).open))) await more.locator("summary").click();
  await expect(more).toHaveJSProperty("open", true);
}

/** Nothing typed yet: the See button is the one filled button, and it sends you to the first empty box. */
export async function expectWaitingButtons(page: Page, see: string, firstBox: string) {
  await expect(page.locator(".primary")).toHaveCount(1);
  const button = page.getByRole("button", { name: see, exact: true });
  await expect(button).toBeVisible();
  await expect(button).toHaveClass(/primary/);
  await expect(page.getByRole("link", { name: "I'm done", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
  await expect(page.getByLabel(firstBox)).not.toBeFocused();
  await button.click();
  await expect(page.getByLabel(firstBox)).toBeFocused();
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
  await expect(page.locator(".nt-finish-line")).toHaveText(`That is your ${word}. You can stop here, or change a number to try again.`);
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

/** At a wide screen the answer sits beside the boxes, so the See button is hidden. */
export async function expectSeeHiddenWhenWide(page: Page, see: string) {
  const size = page.viewportSize();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("button", { name: see, exact: true })).toBeHidden();
  if (size) await page.setViewportSize(size);
}
