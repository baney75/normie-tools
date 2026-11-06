import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";
import { shippedTools } from "./shipped";
import { TOURS } from "./walk";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

const PAGES = [
  { name: "home", hash: "" },
  { name: "agents", hash: "#/agents" },
  { name: "install", hash: "#/install" },
  { name: "demo flow", hash: "#/harness" },
  { name: "coming", hash: "#/coming" },
  { name: "private", hash: "#/private" },
  // Every shipped tool opens on step 1 with empty boxes; the other steps and the answer screen are scanned in the tests below.
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

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Each tool is a short flow of question screens, then an answer screen. The scan above covers step 1, empty.
// These walk each tool with real values and scan every question screen (before and after it is filled) and the answer screen.
for (const tour of TOURS) {
  test(`axe finds nothing on any screen of ${tour.id}`, async ({ page }) => {
    // Up to nine axe scans in one test; WebKit under load needs more than the 30 second default.
    test.setTimeout(90_000);
    await page.goto(`#/tools/${tour.id}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByLabel(tour.firstBox).first()).toBeVisible();
    const found: string[] = [];
    await tour.run(page, async (screen) => {
      const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of result.violations) found.push(`${screen}: ${v.id}: ${v.help} (${v.nodes.length})`);
    });
    expect(found).toEqual([]);
  });

  // The "I'm done" link and "Print or save" only show on the answer screen, and Print or save opens a sheet there.
  test(`axe finds nothing on the ${tour.id} answer screen with Print or save open`, async ({ page }) => {
    await page.goto(`#/tools/${tour.id}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByLabel(tour.firstBox).first()).toBeVisible();
    await tour.run(page, async () => {});
    await expect(page.getByRole("link", { name: "I'm done" })).toBeVisible();
    await page.getByRole("button", { name: "Print or save" }).click();
    await expect(page.getByRole("heading", { name: "Print or save", exact: true })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}
