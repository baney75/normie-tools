import { expect, test } from "@playwright/test";

test("the shell loads offline after the service worker installs", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "offline shell is checked in Chromium");
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

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("What do you want to get done?")).toBeVisible();
  await context.setOffline(false);
});
