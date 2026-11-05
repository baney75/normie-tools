// Tax Filing Helper: pick a way, read the sheet, copy answers in, end on the review page.
export default async (page, capture) => {
  await page.getByText("Pick one way to practice, then press Next.").waitFor();
  const start = await capture();
  await page.getByLabel(/Guided Free File/).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("heading", { name: "Your answer sheet" }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  let middle = null;
  for (let i = 0; i < 10; i++) {
    await page.getByText("Type this").first().waitFor();
    const boxes = page.locator("main .nt-tfh-item");
    const n = await boxes.count();
    for (let j = 0; j < n; j++) {
      const item = boxes.nth(j);
      await item.locator("input").fill((await item.locator(".nt-tfh-big").innerText()).trim());
    }
    await page.waitForTimeout(150);
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    if (!middle) middle = await capture();
    const last = page.getByRole("button", { name: /practice review page/ });
    if (await last.count()) { await last.click(); break; }
    await page.getByRole("button", { name: "Next screen" }).click();
  }
  await page.getByRole("heading", { name: "The practice review page" }).waitFor();
  await page.waitForTimeout(150);
  return [{ name: "start", cap: start }, { name: "copy-in", cap: middle }, { name: "review", cap: await capture() }];
};
