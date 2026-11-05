// debt-payoff-planner: real-looking numbers, so the reader sees a sensible answer. Empty screen first, then filled.
export default async (page, capture) => {
  const empty = await capture();
  const set = async (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  await set("Debt 1 balance", "800");
  await set("Debt 1 yearly interest rate", "6.5");
  await set("Debt 1 minimum payment", "40");
  await set("Debt 2 balance", "5000");
  await set("Debt 2 yearly interest rate", "22.99");
  await set("Debt 2 minimum payment", "120");
  await set("Extra each month (optional)", "100");
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  return [{ name: "empty", cap: empty }, { name: "filled", cap: await capture() }];
};
