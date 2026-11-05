// Form Filler: answer four questions, tick papers, fill the eight info boxes, end on the review page.
const SAMPLE = { firstName: "Sample", lastName: "Person", street: "123 Example Street", city: "Springfield", state: "OH", zip: "45501", birthDate: "1980-05-17", phone: "5555550123" };
export default async (page, capture) => {
  await page.getByText("Question 1 of 4").waitFor();
  const start = await capture();
  const next = async () => { await page.getByRole("button", { name: "Next", exact: true }).click(); await page.waitForTimeout(150); };
  for (let q = 1; q <= 4; q++) {
    await page.getByText(`Question ${q} of 4`).waitFor();
    await page.locator("label.nt-ff-choice", { hasText: q === 4 ? /^No$/ : /^Yes$/ }).click(); await page.waitForTimeout(150);
    await next();
  }
  await page.getByText("Which free way may fit").first().waitFor();
  await next();
  for (const i of [0, 1, 4]) { await page.locator("label.nt-ff-check").nth(i).click(); await page.waitForTimeout(150); }
  await page.waitForTimeout(150);
  const papers = await capture();
  await next();
  for (let i = 1; i <= 8; i++) {
    await page.getByText(`Box ${i} of 8`).waitFor();
    const box = page.locator("main .nt-ff-input");
    const id = (await box.getAttribute("id")).replace("nt-ff-", "");
    if (id === "state") await box.selectOption(SAMPLE.state);
    else await box.fill(SAMPLE[id]);
    if (i === 1) { await page.waitForTimeout(150); }
    await next();
  }
  await page.getByRole("heading", { name: "Look it over" }).waitFor();
  await page.waitForTimeout(150);
  return [{ name: "start", cap: start }, { name: "papers", cap: papers }, { name: "review", cap: await capture() }];
};
