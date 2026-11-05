import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";

test.use({ viewport: { width: PHONE.width, height: PHONE.height }, reducedMotion: "reduce" });

test("no animation or transition runs when the device asks for less motion", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  const moving = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      const anim = cs.animationName !== "none" && cs.animationDuration !== "0s";
      const trans = cs.transitionDuration.split(",").some((d) => d.trim() !== "0s");
      if (anim || trans) bad.push(`${el.tagName.toLowerCase()}.${el.className}`);
    }
    return bad;
  });
  expect(moving).toEqual([]);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});
