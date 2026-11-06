// Makes the pictures that represent NT outside the site:
//   site/public/og/nt.png and og/<tool>.png   link previews (1200 by 630), one for the site and one per shipped tool
//   site/public/screens/*.png                 the install screenshots named in manifest.webmanifest
//   site/public/icons/apple-touch-icon.png    the 180 by 180 home screen icon for iPhone and iPad
// The previews show the real answer screen in a phone, beside the tool's question. Words come from site/src/copy/share.ts.
// It needs a built site to photograph. Run from the repo root:
//   npm run build && node scripts/gen-share.mjs --site http://127.0.0.1:4173/nt/   (serve site/dist at /nt/ first)
// Uses Playwright Chromium, like gen-splash.mjs. No network, no new packages.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { SHARE_TOOLS, SITE } from "../site/src/copy/share.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "site/public");
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const site = arg("--site");
if (!site) {
  console.error("usage: node scripts/gen-share.mjs --site <url of a built NT site, ending in /nt/>");
  process.exit(2);
}

const tokens = JSON.parse(fs.readFileSync(path.join(root, "brand/tokens.json"), "utf8")).colors;
const font = (file) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, "node_modules/@fontsource-variable", file)).toString("base64")}`;
const wordmark = fs.readFileSync(path.join(root, "site/public/brand/nt-wordmark-light.svg"), "utf8");
const png = (file) => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;

// Each walk fills the steps with the sample numbers in share.ts and stops on the answer.
const fill = (label, value) => async (p) => p.getByLabel(label, { exact: true }).fill(value);
const pick = (label) => async (p) => p.getByLabel(label, { exact: true }).check();
const WALKS = {
  "loan-explainer": [fill("Amount borrowed", "12000"), fill("Yearly interest rate", "6.5"), pick("3 years")],
  "mortgage-payment-explainer": [fill("Home price", "300000"), fill("Down payment", "60000"), fill("Yearly interest rate", "6.5"), pick("30 years")],
  "student-loan-growth-and-payoff": [fill("Loan balance", "20000"), fill("Yearly interest rate", "5"), fill("Monthly payment (optional)", "300")],
  "loan-offer-compare": [
    async (p) => { await fill("Offer 1: Amount borrowed", "12000")(p); await fill("Offer 1: Yearly interest rate", "7.5")(p); },
    fill("Offer 1: How long is the loan?", "36"),
    async (p) => { await fill("Offer 2: Amount borrowed", "12000")(p); await fill("Offer 2: Yearly interest rate", "6.9")(p); },
    async (p) => { await fill("Offer 2: How long is the loan?", "36")(p); await fill("Offer 2: Upfront fees (optional)", "400")(p); },
  ],
  "monthly-budget": [
    fill("Pay, per month", "3200"),
    async (p) => { for (const [l, v] of [["Rent or mortgage", "1200"], ["Food", "500"], ["Bills", "300"], ["Transport", "250"], ["Other", "150"]]) await fill(`${l}, per month`, v)(p); },
  ],
  "unit-converter": [pick("Length"), fill("Number", "12")],
};

const browser = await chromium.launch();
const shotsDir = path.join(pub, "screens");
const ogDir = path.join(pub, "og");
fs.mkdirSync(shotsDir, { recursive: true });
fs.mkdirSync(ogDir, { recursive: true });

// 1. Phone screenshots of each answer, and of Loan Explainer's first step, at 390 by 844 (an iPhone 15), drawn at 2x.
async function phone(id, stopAtFirstStep = false) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(`${site}#/tools/${id}`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  if (!stopAtFirstStep) {
    for (const step of WALKS[id]) {
      await step(page);
      await page.locator(".nt-flow-next").click();
    }
    await page.locator(".nt-flow-answer").waitFor();
  }
  await page.evaluate(async () => { document.activeElement?.blur(); window.scrollTo(0, 0); await document.fonts.ready; });
  const file = path.join(shotsDir, stopAtFirstStep ? `${id}-start.png` : `${id}.png`);
  await page.screenshot({ path: file });
  await page.close();
  return file;
}
const answers = {};
for (const t of SHARE_TOOLS) answers[t.id] = await phone(t.id);
await phone("loan-explainer", true);

// A wide screenshot of the home page for install sheets on a computer.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(site, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(shotsDir, "home-wide.png") });
  await page.close();
}

// 2. Link previews.
const lock = `<svg viewBox="0 0 16 16" width="26" height="26" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="${tokens.ink}"/><path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" fill="none" stroke="${tokens.ink}" stroke-width="1.5"/></svg>`;
const card = ({ kicker, big, shot }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Fraunces; src: url(${font("fraunces/files/fraunces-latin-soft-normal.woff2")}) format("woff2-variations"); font-weight: 100 900; }
  @font-face { font-family: Figtree; src: url(${font("figtree/files/figtree-latin-wght-normal.woff2")}) format("woff2-variations"); font-weight: 300 900; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: ${tokens.paper}; font-family: Figtree, sans-serif; color: ${tokens.text}; position: relative; }
  .left { position: absolute; left: 80px; top: 64px; bottom: 64px; width: 640px; display: flex; flex-direction: column; }
  .mark svg { height: 48px; width: auto; display: block; }
  .kicker { margin-top: 56px; font-size: 28px; font-weight: 700; color: ${tokens.tdeep}; }
  h1 { margin-top: 12px; font-family: Fraunces, serif; font-variation-settings: "SOFT" 100; font-weight: 700; font-size: ${big.length > 34 ? 60 : 68}px; line-height: 1.06; color: ${tokens.ink}; text-wrap: balance; }
  .foot { margin-top: auto; display: flex; flex-direction: column; gap: 14px; }
  .promise { display: flex; align-items: center; gap: 12px; font-size: 26px; color: ${tokens.text}; }
  .url { font-size: 26px; font-weight: 700; color: ${tokens.ink}; }
  .phone { position: absolute; right: 72px; top: 48px; width: 336px; height: 700px; padding: 12px; border-radius: 52px; background: ${tokens.ink}; box-shadow: 0 24px 60px rgba(19, 78, 58, 0.28); }
  .screen { width: 100%; height: 100%; border-radius: 40px; overflow: hidden; background: ${tokens.paper}; }
  .screen img { width: 312px; display: block; }
</style></head><body>
  <div class="left">
    <div class="mark">${wordmark}</div>
    <p class="kicker">${kicker}</p>
    <h1>${big}</h1>
    <div class="foot">
      <p class="promise">${lock}<span>${SITE.promise}</span></p>
      <p class="url">dbaney.com/nt</p>
    </div>
  </div>
  <div class="phone"><div class="screen"><img src="${png(shot)}" alt=""></div></div>
</body></html>`;

async function og(file, html) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(ogDir, file) });
  await page.close();
}
await og("nt.png", card({ kicker: "Loans, budgets and more, in plain words", big: SITE.headline, shot: answers["loan-explainer"] }));
for (const t of SHARE_TOOLS) await og(`${t.id}.png`, card({ kicker: t.name, big: t.question, shot: answers[t.id] }));

// 3. The iPhone home screen icon: the full-bleed maskable icon at 180 by 180, so iOS rounds the corners itself.
{
  const page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0"><img src="${png(path.join(pub, "icons/icon-maskable-512.png"))}" width="180" height="180" style="display:block"></body>`, { waitUntil: "load" });
  await page.screenshot({ path: path.join(pub, "icons/apple-touch-icon.png") });
  await page.close();
}

await browser.close();
console.log(`wrote ${SHARE_TOOLS.length + 1} link previews, ${SHARE_TOOLS.length + 2} screenshots and the apple touch icon`);
