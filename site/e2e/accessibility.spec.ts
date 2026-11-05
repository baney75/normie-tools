import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

const PAGES = [
  { name: "home", hash: "" },
  { name: "agents", hash: "#/agents" },
  { name: "install", hash: "#/install" },
  { name: "demo flow", hash: "#/harness" },
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
