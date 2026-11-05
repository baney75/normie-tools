import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PHONE, VIEWPORTS } from "./viewports";

const ROUTES = [
  { name: "home", hash: "" },
  { name: "agents", hash: "#/agents" },
  { name: "install", hash: "#/install" },
];

// Other matrix screenshots go to a gitignored folder. The two home shots in shots/ are committed.
const MATRIX_DIR = path.resolve(import.meta.dirname, "../screenshots");
const SHOTS_DIR = path.resolve(import.meta.dirname, "../../shots");

async function overflow(page: Page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    return { scroll: el.scrollWidth, client: el.clientWidth, body: document.body.scrollWidth };
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const r of ROUTES) {
      test(`${r.name} has no sideways scroll`, async ({ page }, info) => {
        await page.goto(`/${r.hash}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const o = await overflow(page);
        expect(o.scroll, "page is wider than the screen").toBeLessThanOrEqual(o.client);
        expect(o.body).toBeLessThanOrEqual(o.client);
        if (r.name === "home" && info.project.name === "chromium") {
          fs.mkdirSync(MATRIX_DIR, { recursive: true });
          await page.screenshot({ path: path.join(MATRIX_DIR, `home-${vp.name}.png`), fullPage: true });
        }
      });
    }
  });
}

test.describe("home loads", () => {
  test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

  test("home shows one prompt box and a grid of Coming soon tools", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.getByLabel("What do you want to get done?")).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();
  });
});

test.describe("evidence shots", () => {
  test("home at 390 and 1280", async ({ page }, info) => {
    test.skip(info.project.name !== "chromium", "one browser makes the committed shots");
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS_DIR, "home-390.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: path.join(SHOTS_DIR, "home-1280.png"), fullPage: true });
  });
});
