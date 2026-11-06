// Shared by the scene files: walk a step flow the way a person does.
// Each step is a list of actions; after each step the scene taps the filled Continue button.
// With capture, every question screen after step 1 is captured as the person first sees it (named step2, step3, ...), so
// the evidence gate reviews every screen of the flow, not only step 1 and the answer. scenes/screens.json lists them.
export async function walk(page, steps, capture) {
  const seen = [];
  for (const [i, actions] of steps.entries()) {
    if (capture && i > 0) {
      await page.evaluate(() => { document.activeElement instanceof HTMLElement && document.activeElement.blur(); window.scrollTo(0, 0); });
      seen.push({ name: `step${i + 1}`, cap: await capture() });
    }
    for (const act of actions) await act(page);
    await page.locator(".nt-flow-next").click();
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => { document.activeElement instanceof HTMLElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.waitForTimeout(150);
  return seen;
}
export const fill = (label, value) => (page) => page.getByLabel(label, { exact: true }).fill(value);
export const pick = (label) => (page) => page.getByLabel(label, { exact: true }).check();
