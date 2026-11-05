import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";
import { shippedTools } from "./shipped";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

const PAGES = [
  { name: "home", hash: "" },
  { name: "agents", hash: "#/agents" },
  { name: "install", hash: "#/install" },
  { name: "demo flow", hash: "#/harness" },
  { name: "coming", hash: "#/coming" },
  { name: "private", hash: "#/private" },
  // Every shipped tool opens with empty boxes; the filled answer card is scanned in the tests below.
  ...shippedTools().map((t) => ({ name: t.id, hash: t.hash })),
];

for (const p of PAGES) {
  test(`axe finds nothing on ${p.name} at phone size`, async ({ page }) => {
    await page.goto(`${p.hash}`);
    await expect(page.getByRole("heading", { level: 1 }).or(page.getByRole("heading", { level: 2 })).first()).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}

test("#/private loads with its title as the h1", async ({ page }) => {
  await page.goto("#/private");
  await expect(page.getByRole("heading", { level: 1, name: "Your numbers stay with you" })).toBeVisible();
});

// The answer card, "I'm done" and "Print or save" only show once there is an answer, so each tool is scanned filled too.
const FILLED: { name: string; hash: string; fill: (page: import("@playwright/test").Page) => Promise<void> }[] = [
  { name: "loan-explainer", hash: "#/tools/loan-explainer", fill: async (page) => {
    await page.getByLabel("Amount borrowed", { exact: true }).fill("12000");
    await page.getByLabel("Yearly interest rate", { exact: true }).fill("6.5");
    await page.getByLabel("3 years", { exact: true }).check();
  } },
  { name: "loan-offer-compare", hash: "#/tools/loan-offer-compare", fill: async (page) => {
    for (const n of [1, 2]) {
      await page.getByLabel(`Offer ${n}: Amount borrowed`, { exact: true }).fill("12000");
      await page.getByLabel(`Offer ${n}: Yearly interest rate`, { exact: true }).fill(n === 1 ? "7.5" : "6.9");
      await page.getByLabel(`Offer ${n}: How long is the loan?`, { exact: true }).fill("36");
    }
  } },
  { name: "mortgage-payment-explainer", hash: "#/tools/mortgage-payment-explainer", fill: async (page) => {
    await page.getByLabel("Home price", { exact: true }).fill("300000");
    await page.getByLabel("Down payment", { exact: true }).fill("60000");
    await page.getByLabel("Yearly interest rate", { exact: true }).fill("6.5");
    await page.getByLabel("30 years", { exact: true }).check();
  } },
  { name: "student-loan-growth-and-payoff", hash: "#/tools/student-loan-growth-and-payoff", fill: async (page) => {
    await page.getByLabel("Loan balance", { exact: true }).fill("20000");
    await page.getByLabel("Yearly interest rate", { exact: true }).fill("5");
    await page.getByLabel("Monthly payment (optional)", { exact: true }).fill("300");
  } },
  { name: "monthly-budget", hash: "#/tools/monthly-budget", fill: async (page) => {
    await page.getByLabel("Pay, per month", { exact: true }).fill("3000");
    await page.getByLabel("Food, per month", { exact: true }).fill("400");
  } },
  { name: "unit-converter", hash: "#/tools/unit-converter", fill: async (page) => {
    await page.getByLabel("Number", { exact: true }).fill("12");
  } },
];

for (const p of FILLED) {
  test(`axe finds nothing on ${p.name} with an answer showing`, async ({ page }) => {
    await page.goto(p.hash);
    await p.fill(page);
    await expect(page.getByRole("link", { name: "I'm done" })).toBeVisible();
    await page.getByRole("button", { name: "Print or save" }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}
