import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { publicPath } from "./paths";
import { PHONE } from "./viewports";

const tools = JSON.parse(fs.readFileSync(publicPath("tools.json"), "utf8")).tools as { id: string; name: string; status: string }[];
const shipped = tools.filter((t) => t.status === "shipped");
const coming = tools.filter((t) => t.status !== "shipped");

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

// Coming-soon tools never link to a tool page. They live on #/coming as plain text, and in search results
// as a row that says "Not ready yet" and links to #/coming.

test("home lists only the tools that work, as links, and never links a coming-soon tool", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 2, name: "Ready to use" })).toBeVisible();
  // One link row per shipped tool, each to its own tool page.
  await expect(page.locator("a.nt-row")).toHaveCount(shipped.length);
  for (const t of shipped) {
    await expect(page.locator(`a.nt-row[href="#/tools/${t.id}"]`)).toHaveCount(1);
  }
  // No link on the page points at a coming-soon tool.
  for (const t of coming) {
    await expect(page.locator(`a[href$="/tools/${t.id}"]`)).toHaveCount(0);
  }
  // No badges, no tool count, no wall of tools.
  await expect(page.getByText("Coming soon")).toHaveCount(0);
  await expect(page.getByText("Not ready yet")).toHaveCount(0);
  await expect(page.locator(".nt-card-off")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(new RegExp(`\\b${tools.length}\\b`));
  for (const t of coming.slice(0, 5)) {
    await expect(page.locator("body")).not.toContainText(t.name);
  }
  // One quiet link to the coming page.
  const more = page.getByRole("link", { name: "See what is coming" });
  await expect(more).toHaveAttribute("href", "#/coming");
  await more.click();
  await expect(page).toHaveURL(/#\/coming$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("#/coming lists every coming-soon tool as plain text, with no link to a tool", async ({ page }) => {
  await page.goto("#/coming");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const items = await page.locator("ul.nt-list li").allTextContents();
  const listed = new Set(items.map((s) => s.trim()));
  for (const t of coming) {
    expect(listed.has(t.name), `${t.name} is listed on #/coming`).toBe(true);
  }
  // A shipped tool is not "coming".
  for (const t of shipped) {
    expect(listed.has(t.name), `${t.name} is not listed on #/coming`).toBe(false);
  }
  // Plain text: no list item holds a link, and nothing on the page links to any tool page.
  await expect(page.locator("ul.nt-list li")).toHaveCount(coming.length);
  await expect(page.locator("ul.nt-list a")).toHaveCount(0);
  await expect(page.locator('a[href*="/tools/"]')).toHaveCount(0);
  await expect(page.getByText("Coming soon")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
});

test("a search that finds a coming-soon tool says Not ready yet and links to #/coming, never to the tool", async ({ page }) => {
  const t = coming[0];
  await page.goto("./");
  await page.getByLabel("What do you want to get done?").fill(t.name);
  const row = page.locator("a.nt-row", { hasText: t.name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Not ready yet");
  await expect(row).toHaveAttribute("href", "#/coming");
  await expect(page.locator(`a[href$="/tools/${t.id}"]`)).toHaveCount(0);
  await row.click();
  await expect(page).toHaveURL(/#\/coming$/);
  // And a search that finds a shipped tool links to its page.
  await page.goto("./");
  await page.getByLabel("What do you want to get done?").fill(shipped[0].name);
  const open = page.locator("a.nt-row", { hasText: shipped[0].name }).first();
  await expect(open).toHaveAttribute("href", `#/tools/${shipped[0].id}`);
  await expect(open).not.toContainText("Not ready yet");
});

test("opening a coming-soon tool address by hand shows that it is not ready, not a tool", async ({ page }) => {
  const t = coming[0];
  await page.goto(`#/tools/${t.id}`);
  await expect(page.getByText("This tool is not ready yet.")).toBeVisible();
  await expect(page.locator("input.nt-field-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print or save" })).toHaveCount(0);
});
