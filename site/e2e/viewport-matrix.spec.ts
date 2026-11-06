import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PHONE, VIEWPORTS } from "./viewports";
import { shippedTools } from "./shipped";
import { TOURS } from "./walk";

// Every size in viewports.ts x home, agents, install and every shipped tool (read from public/tools.json).
// Each page must have: no sideways scroll, a visible first heading, (tools) a visible first input or button,
// and every visible button and input at least 44px high (tap targets).
// Every tool is also walked step by step with real values (walk.ts TOURS): each question screen and the answer screen
// get the same two checks, no sideways scroll and no short tap target.
// Runs in all three projects (chromium, webkit, firefox).
//
// Screenshots (clipped to the viewport, not full page, to keep files small) go to shots/matrix/<project>-<size>-<route-id>.png.
// Too many files if every browser wrote them (13 tools + 3 pages) x 9 sizes = 144 per browser, so:
//   webkit   writes all of them while it is the current project;
//   chromium writes home only;
//   firefox  writes none.

const ROUTES = [
  { id: "home", hash: "", tool: false },
  { id: "agents", hash: "#/agents", tool: false },
  { id: "install", hash: "#/install", tool: false },
  ...shippedTools().map((t) => ({ id: t.id, hash: t.hash, tool: true })),
];

const SHOTS_DIR = path.resolve(import.meta.dirname, "../../shots");
const MATRIX_DIR = path.join(SHOTS_DIR, "matrix");
const MIN_TAP = 44;

async function overflow(page: Page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    return { scroll: el.scrollWidth, inner: window.innerWidth, body: document.body.scrollWidth };
  });
}

// Visible buttons, inputs, selects and textareas shorter than 44px. A checkbox or radio counts as its
// label when it has one, since that is what a finger hits. Hidden file inputs are skipped.
async function shortTargets(page: Page) {
  return page.evaluate((min) => {
    const bad: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>("button, input, select, textarea, [role=button]");
    for (const el of nodes) {
      const input = el as HTMLInputElement;
      if (input.type === "hidden" || input.type === "file") continue;
      const cs = getComputedStyle(el);
      let box = el;
      if (input.type === "checkbox" || input.type === "radio") {
        const label = input.closest("label") ?? (input.id ? document.querySelector<HTMLElement>(`label[for="${CSS.escape(input.id)}"]`) : null);
        if (label) box = label;
      }
      const r = box.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      // Visually hidden helpers (clip or 1px) are not tap targets.
      if (!visible || (r.width <= 1 && r.height <= 1)) continue;
      if (r.height < min - 0.5) {
        const name = (el.getAttribute("aria-label") || el.textContent || input.name || input.id || "").trim().slice(0, 30);
        bad.push(`${el.tagName.toLowerCase()}${input.type ? `[${input.type}]` : ""} "${name}" is ${Math.round(r.height)}px high`);
      }
    }
    return bad;
  }, MIN_TAP);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const r of ROUTES) {
      test(`${r.id} fits the screen`, async ({ page }, info) => {
        await page.goto(`${r.hash}`);
        await expect(page.getByRole("heading").first(), "first heading").toBeVisible();
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        if (r.tool) {
          const first = page.locator("input:not([type=hidden]), button, select, textarea").filter({ visible: true }).first();
          await expect(first, "first input or button").toBeVisible();
        }
        // Let the layout settle (fonts, lazy chunk) before measuring.
        await page.evaluate(() => document.fonts.ready);

        const o = await overflow(page);
        expect(o.scroll, `${r.id} is wider than the screen (${o.scroll} > ${o.inner})`).toBeLessThanOrEqual(o.inner);
        expect(o.body, `${r.id} body is wider than the screen`).toBeLessThanOrEqual(o.inner);

        const small = await shortTargets(page);
        expect(small, `tap targets under ${MIN_TAP}px on ${r.id}`).toEqual([]);

        const project = info.project.name;
        if (project === "webkit" || (project === "chromium" && r.id === "home")) {
          fs.mkdirSync(MATRIX_DIR, { recursive: true });
          await page.screenshot({ path: path.join(MATRIX_DIR, `${project}-${vp.name}-${r.id}.png`) });
        }
      });
    }

    for (const tour of TOURS) {
      test(`${tour.id} steps and answer fit the screen`, async ({ page }) => {
        await page.goto(`#/tools/${tour.id}`);
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect(page.getByLabel(tour.firstBox).first()).toBeVisible();
        await tour.run(page, async (screen) => {
          const o = await overflow(page);
          expect(o.scroll, `${tour.id} ${screen} is wider than the screen (${o.scroll} > ${o.inner})`).toBeLessThanOrEqual(o.inner);
          expect(o.body, `${tour.id} ${screen} body is wider than the screen`).toBeLessThanOrEqual(o.inner);
          const small = await shortTargets(page);
          expect(small, `tap targets under ${MIN_TAP}px on ${tour.id} ${screen}`).toEqual([]);
        });
      });
    }
  });
}

test.describe("home loads", () => {
  test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

  test("home shows one search box and only the tools that are ready", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.getByLabel("What do you want to get done?")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Ready to use" })).toBeVisible();
    await expect(page.locator("a.nt-row")).toHaveCount(shippedTools().length);
    await expect(page.getByText("Coming soon")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "See what is coming" })).toBeVisible();
  });
});

test.describe("evidence shots", () => {
  test("home at 390 and 1280", async ({ page }, info) => {
    test.skip(info.project.name !== "chromium", "one browser makes the committed shots");
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS_DIR, "home-390.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: path.join(SHOTS_DIR, "home-1280.png"), fullPage: true });
  });
});
