// monthly-budget: real-looking numbers, so the reader sees a sensible answer. Empty screen first, then filled.
export default async (page, capture) => {
  const empty = await capture();
  const set = async (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  await set("Pay, per month", "3000");
  await set("Rent or mortgage, per month", "1200");
  await set("Food, per month", "450");
  await set("Bills, per month", "300");
  await set("Transport, per month", "250");
  await set("Other, per month", "100");
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  return [{ name: "empty", cap: empty }, { name: "filled", cap: await capture() }];
};
