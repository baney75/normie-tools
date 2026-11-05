// loan-offer-compare: two real-looking offers for the same loan, so the reader sees a sensible answer. Empty screen first, then filled.
export default async (page, capture) => {
  const empty = await capture();
  const set = async (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  for (const [n, rate, fees] of [[1, "7.5", "0"], [2, "6.9", "400"]]) {
    await set(`Offer ${n}: Amount borrowed`, "12000");
    await set(`Offer ${n}: Yearly interest rate`, rate);
    await set(`Offer ${n}: How long is the loan?`, "36");
    await set(`Offer ${n}: Upfront fees (optional)`, fees);
  }
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  return [{ name: "empty", cap: empty }, { name: "filled", cap: await capture() }];
};
