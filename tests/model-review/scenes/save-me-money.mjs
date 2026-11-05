// Save Me Money: start, two costs typed, then the full list with two costs ticked.
export default async (page, capture) => {
  const start = await capture();
  const amount = (name) => page.getByLabel(`${name}, amount`, { exact: true });
  await amount("Phone").fill("45");
  await amount("Internet").fill("60");
  await page.getByLabel("Insurance, how often", { exact: true }).selectOption({ label: "Every year" });
  await amount("Insurance").fill("480");
  await page.getByText("Total for a year").first().waitFor();
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const typed = await capture();
  await amount("Streaming").fill("15.99");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("checkbox").nth(2).check();
  await page.getByText("For:", { exact: false }).first().waitFor();
  await page.waitForTimeout(150);
  return [{ name: "start", cap: start }, { name: "typed", cap: typed }, { name: "list", cap: await capture() }];
};
