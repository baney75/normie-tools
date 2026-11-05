import { expect, test } from "@playwright/test";
import { shippedTools } from "./shipped";

// One online visit to home only. After that, with the network off, home, agents, install and
// every shipped tool must load from the saved copy, including the tool's lazy script and style.
// Chromium only: it is the one engine where Playwright can switch a service worker host offline reliably.

const FIELD = "input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea";

test("home and every shipped tool load and work offline after one online visit", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "offline shell is checked in Chromium");
  test.setTimeout(120_000);

  await page.goto("/");
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
        if (reg.active && navigator.serviceWorker.controller) resolve();
      });
    }
  });
  // Reload once so the page's own files go through the worker and are saved.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // The install step saves the whole build list. Wait until the saved copy holds more than the shell.
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.open("nt-shell-v1")).keys()).length), { timeout: 30_000 })
    .toBeGreaterThan(20);

  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("What do you want to get done?")).toBeVisible();

  for (const hash of ["#/agents", "#/install"]) {
    await page.goto(`/${hash}`);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 }), `${hash} offline`).toBeVisible();
  }

  const tools = shippedTools();
  expect(tools.length).toBeGreaterThan(0);
  for (const t of tools) {
    // goto + reload makes a real offline page load, not just a hash change.
    await page.goto(`/${t.hash}`);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 }), `${t.id} heading offline`).toBeVisible();
    const field = page.locator(FIELD).filter({ visible: true }).first();
    if (await field.count()) {
      await expect(field, `${t.id} first field offline`).toBeVisible();
      const type = (await field.getAttribute("type")) ?? "text";
      if (await field.isEditable()) {
        await field.click();
        await page.keyboard.type(type === "number" || type === "tel" ? "12" : "ab");
        await expect(field, `${t.id} typing works offline`).not.toHaveValue("");
      }
    } else {
      // File-first tools (pick a file) have no text field. A button must be there instead.
      await expect(page.getByRole("button").filter({ visible: true }).first(), `${t.id} first button offline`).toBeVisible();
    }
  }
  await context.setOffline(false);
});
