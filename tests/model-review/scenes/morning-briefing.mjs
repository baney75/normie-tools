// Morning Briefing: pick parts, type a day and reminders, read the briefing.
export default async (page, capture) => {
  await page.getByText("Parts to include").waitFor();
  const pick = await capture();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Time of thing 1", { exact: true }).fill("8:30 am");
  await page.getByLabel("Name of thing 1", { exact: true }).fill("Call Sample Person");
  await page.getByLabel("Reminder 1", { exact: true }).fill("Water the plants");
  await page.getByRole("button", { name: "Add a reminder" }).click();
  await page.getByLabel("Reminder 2", { exact: true }).fill("Mail the letter");
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const typed = await capture();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("article", { name: "Your briefing" }).waitFor();
  await page.waitForTimeout(150);
  return [{ name: "pick", cap: pick }, { name: "typed", cap: typed }, { name: "briefing", cap: await capture() }];
};
