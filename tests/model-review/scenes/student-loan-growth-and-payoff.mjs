// student-loan-growth-and-payoff: real-looking numbers, so the reader sees a sensible answer. Empty screen first, then filled.
export default async (page, capture) => {
  const empty = await capture();
  const set = async (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  await set("Loan balance", "20000");
  await set("Yearly interest rate", "5");
  await set("Monthly payment (optional)", "300");
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  return [{ name: "empty", cap: empty }, { name: "filled", cap: await capture() }];
};
