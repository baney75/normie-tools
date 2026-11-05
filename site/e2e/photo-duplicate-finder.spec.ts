import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import zlib from "node:zlib";
import { shotPath } from "./paths";

// Made-up pictures drawn here: no real photos. Two files hold the same bytes, one is different.
test.use({ viewport: { width: 390, height: 844 } });

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head[8] = 8;
  head[9] = 2;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) row.set(pixel(x, y), 1 + x * 3);
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", head),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const bright = (x: number): [number, number, number] => [255 - x * 12, 255 - x * 12, 255 - x * 12];
const dark = (x: number): [number, number, number] => [x * 12, x * 12, x * 12];
const SUNSET = png(24, (x) => bright(x));
const OTHER = png(24, (x) => dark(x));

async function pick(page: Page) {
  await page.getByLabel("Pick photos").setInputFiles([
    { name: "sunset.png", mimeType: "image/png", buffer: SUNSET },
    { name: "sunset copy.png", mimeType: "image/png", buffer: SUNSET },
    { name: "other.png", mimeType: "image/png", buffer: OTHER },
  ]);
  await expect(page.getByLabel("Photos picked", { exact: true })).toContainText("3");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/tools/photo-duplicate-finder");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Pick photos")).toBeVisible();
});

test("shows an empty state with one next step", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Photo Duplicate Finder" })).toBeVisible();
  await expect(page.getByText("Step 1 of 3: Pick your photos")).toBeVisible();
  await expect(page.getByLabel("Photos picked", { exact: true })).toContainText("Pick two or more photos");
  await expect(page.getByRole("button", { name: "Look for copies" })).toBeDisabled();
  await expect(page.getByText("Nothing is sent.")).toBeVisible();
});

test("finds exact copies, lets the person choose, and saves a list of names", async ({ page }) => {
  await pick(page);
  await page.getByRole("button", { name: "Look for copies" }).click();
  await expect(page.getByText("Step 2 of 3: Look at the groups")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Group 1 of 1: Exact copies" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Keep sunset copy\.png/ })).toBeChecked();
  await expect(page.locator("img.nt-pdf-thumb").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: shotPath("photo-duplicate-finder-phone.png"), fullPage: true });

  await page.getByRole("button", { name: "Review my list" }).click();
  await expect(page.getByText("Step 3 of 3: Check your list")).toBeVisible();
  await expect(page.getByLabel("Marked to remove", { exact: true })).toContainText("1 file");
  await expect(page.getByText("Nothing was deleted. Your photos are untouched.")).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Save my list of extras" }).click()]);
  const text = fs.readFileSync((await download.path())!, "utf8");
  expect(text).toContain("sunset.png");
  expect(text).not.toContain("other.png");
  await expect(page.getByText("Your list was saved.")).toBeVisible();
});

test("Put it back marks nothing in that group", async ({ page }) => {
  await pick(page);
  await page.getByRole("button", { name: "Look for copies" }).click();
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(page.getByText("Nothing is marked in this group.")).toBeVisible();
  await page.getByRole("button", { name: "Review my list" }).click();
  await expect(page.getByLabel("Marked to remove", { exact: true })).toContainText("Nothing is marked");
  await expect(page.getByRole("button", { name: "Save my list of extras" })).toBeDisabled();
});

test("a PDF gets a calm message that says what it is, what is needed and where to learn more", async ({ page }) => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  await page.getByLabel("Pick photos").setInputFiles({ name: "statement.pdf", mimeType: "application/pdf", buffer: pdf });
  const message = page.getByRole("status").first();
  await expect(message).toContainText("This is a PDF.");
  await expect(message).toContainText("This tool needs a photo.");
  await expect(message.getByRole("link").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|Infinity|undefined/);
});

test("tap targets are 44px or more", async ({ page }) => {
  await pick(page);
  await page.getByRole("button", { name: "Look for copies" }).click();
  const buttons = page.locator(".nt-pdf-primary, .nt-pdf-btn, .nt-pdf-member");
  for (let i = 0; i < (await buttons.count()); i++) {
    const h = await buttons.nth(i).evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  }
});

test("a desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await pick(page);
  await page.getByRole("button", { name: "Look for copies" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Group 1 of 1: Exact copies" })).toBeVisible();
  await page.screenshot({ path: shotPath("photo-duplicate-finder-desktop.png"), fullPage: true });
});
