import { isShipped } from "./shipped";
import { expect, test } from "@playwright/test";
import { PHONE } from "./viewports";

test.use({ viewport: { width: PHONE.width, height: PHONE.height } });

test("a wrong file type says what was given, what is needed, what it is, and how to get it", async ({ page }) => {
  await page.goto("/#/harness");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Next" }).click();

  // Real PDF header bytes, so detection goes by content and not by the name.
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  await page.getByLabel("Pick a CSV file").setInputFiles({ name: "statement.pdf", mimeType: "application/pdf", buffer: pdf });

  const message = page.getByRole("status");
  await expect(message).toBeVisible();
  const paragraphs = await message.locator("p").allInnerTexts();
  expect(paragraphs[0]).toMatch(/PDF/);   // what you gave
  expect(paragraphs[1]).toMatch(/CSV/i);  // what is needed
  expect(paragraphs.length).toBeGreaterThanOrEqual(3); // what it is
  await expect(message.getByRole("link")).toBeVisible(); // how to get it
});

test("the right file type is accepted and no problem shows", async ({ page }) => {
  await page.goto("/#/harness");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Pick a CSV file").setInputFiles({
    name: "bank.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("date,amount\n2026-01-02,12.50\n"),
  });
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("Photo Duplicate Finder: a PDF says what it is, what is needed, what that is, and how to get it", async ({ page }) => {
  test.skip(!isShipped("photo-duplicate-finder"), "coming soon");
  await page.goto("/#/tools/photo-duplicate-finder");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  await page.getByLabel("Pick photos").setInputFiles({ name: "statement.pdf", mimeType: "application/pdf", buffer: pdf });
  const message = page.getByRole("status").first();
  await expect(message).toBeVisible();
  const paragraphs = await message.locator("p").allInnerTexts();
  expect(paragraphs[0]).toMatch(/PDF/); // what you gave
  expect(paragraphs[1]).toMatch(/photo/i); // what is needed
  expect(paragraphs.length).toBeGreaterThanOrEqual(3); // what it is
  await expect(message.getByRole("link").first()).toBeVisible(); // how to get it
});

// Form Filler takes a saved answer file. A wrong type gets the same four-part message.
test("form-filler: a wrong file type says what was given, what is needed, what it is, and how to get it", async ({ page }) => {
  test.skip(!isShipped("form-filler"), "coming soon");
  await page.goto("/#/tools/form-filler");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Have saved answers?" }).click();
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  await page.getByLabel("Open my saved answers").setInputFiles({ name: "return.pdf", mimeType: "application/pdf", buffer: pdf });

  const message = page.locator(".nt-upload-message");
  await expect(message).toBeVisible();
  const paragraphs = await message.locator("p").allInnerTexts();
  expect(paragraphs[0]).toMatch(/PDF/);
  expect(paragraphs[1]).toMatch(/plain text file/i);
  expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  await expect(message.getByRole("link")).toBeVisible();
});
