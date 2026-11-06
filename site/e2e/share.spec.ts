import { expect, test, type Page } from "@playwright/test";
import { SHARE_TOOLS, SITE } from "../src/copy/share";
import { openFresh, walkBudget, walkLoan, walkMortgage, walkOffers, walkStudent, walkUnit } from "./walk";

// Link previews and search. Each shipped tool has its own page (tools/<id>/) with its own title, description and share
// picture, and that page opens the tool. The pictures it names exist at the size the tags say. Every sample answer drawn on a
// share picture is what the tool really shows for the sample numbers.

const meta = (page: Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute("content");

async function pngSize(page: Page, url: string) {
  const res = await page.request.get(url);
  expect(res.status(), `${url} is served`).toBe(200);
  expect(res.headers()["content-type"], `${url} is a PNG`).toContain("image/png");
  const b = await res.body();
  // A PNG keeps its width and height at bytes 16 to 24.
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** A site address (https://dbaney.com/nt/...) as the same file on the test server. */
const local = (abs: string) => abs.replace(SITE.url, "");

test("the home page has its title, description, canonical address, share picture and structured data", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(SITE.title);
  expect(await meta(page, "description")).toBe(SITE.description);
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(SITE.url);
  expect(await meta(page, "og:url")).toBe(SITE.url);
  expect(await meta(page, "twitter:card")).toBe("summary_large_image");
  const image = await meta(page, "og:image");
  expect(image).toBe(SITE.url + SITE.image);
  expect(await pngSize(page, local(image!))).toEqual({ width: 1200, height: 630 });
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@type"]).toBe("WebApplication");
  expect(ld.offers.price).toBe("0");
});

for (const t of SHARE_TOOLS) {
  test(`${t.id}: its own page has its own share tags and opens the tool`, async ({ page }) => {
    await page.goto(`tools/${t.id}/`);
    const title = `${t.name}: ${t.question} | ${SITE.name}`;
    expect(await meta(page, "og:title")).toBe(title);
    expect(await meta(page, "description")).toBe(t.description);
    expect(await meta(page, "og:url")).toBe(`${SITE.url}tools/${t.id}/`);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(`${SITE.url}tools/${t.id}/`);
    const image = await meta(page, "og:image");
    expect(image).toBe(`${SITE.url}og/${t.id}.png`);
    expect(await pngSize(page, local(image!))).toEqual({ width: 1200, height: 630 });
    // The page is the app, opened on the tool.
    await expect(page.locator(".nt-flow-count")).toHaveText(/^Step 1 of /);
    await expect(page.locator(".nt-tool-name").first()).toHaveText(t.name);
    await expect(page).toHaveTitle(title);
  });
}

test("the sitemap lists the home page and every tool page", async ({ page }) => {
  const res = await page.request.get("sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual([SITE.url, ...SHARE_TOOLS.map((t) => `${SITE.url}tools/${t.id}/`)]);
});

test("the install details name screenshots and icons that exist at their stated sizes", async ({ page }) => {
  const res = await page.request.get("manifest.webmanifest");
  const m = await res.json();
  expect(m.id).toBe("/nt/");
  expect(m.screenshots.some((s: { form_factor: string }) => s.form_factor === "narrow")).toBe(true);
  expect(m.screenshots.some((s: { form_factor: string }) => s.form_factor === "wide")).toBe(true);
  for (const s of [...m.screenshots, ...m.icons]) {
    const [w, h] = s.sizes.split("x").map(Number);
    expect(await pngSize(page, s.src), s.src).toEqual({ width: w, height: h });
  }
  await page.goto("./");
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(await pngSize(page, touch!.replace(/^\/nt\//, ""))).toEqual({ width: 180, height: 180 });
});

// The sample numbers each share picture was drawn with (scripts/gen-share.mjs), walked the way a person would.
const SAMPLES: Record<string, (page: Page) => Promise<void>> = {
  "loan-explainer": (p) => walkLoan(p, { amount: "12000", rate: "6.5", term: "3", unit: "Years" }),
  "mortgage-payment-explainer": (p) => walkMortgage(p, { price: "300000", down: "60000", rate: "6.5", term: "30" }),
  "student-loan-growth-and-payoff": (p) => walkStudent(p, { balance: "20000", rate: "5", payment: "300" }),
  "loan-offer-compare": (p) => walkOffers(p, [{ amount: "12000", rate: "7.5", term: "36" }, { amount: "12000", rate: "6.9", term: "36", fees: "400" }]),
  "monthly-budget": (p) => walkBudget(p, { pay: "3200", spend: { "Rent or mortgage": "1200", Food: "500", Bills: "300", Transport: "250", Other: "150" } }),
  "unit-converter": (p) => walkUnit(p, { kind: "Length", value: "12" }),
};
const FIRST_BOX: Record<string, string> = {
  "loan-explainer": "Amount borrowed",
  "mortgage-payment-explainer": "Home price",
  "student-loan-growth-and-payoff": "Loan balance",
  "loan-offer-compare": "Offer 1: Amount borrowed",
  "monthly-budget": "Pay, per month",
  "unit-converter": "Length",
};

for (const t of SHARE_TOOLS) {
  test(`${t.id}: the sample answer in the share words is what the tool shows`, async ({ page }) => {
    await openFresh(page, t.id, FIRST_BOX[t.id]);
    await SAMPLES[t.id](page);
    const card = page.locator(".nt-result");
    await expect(card).toContainText(t.sample.label);
    await expect(card).toContainText(t.sample.answer);
    await expect(card).toContainText(t.sample.basis);
  });
}
