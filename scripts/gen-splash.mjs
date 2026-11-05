// Makes the iOS launch screens in site/public/splash/, the maskable icon, and prints the <link> tags for site/index.html.
// Uses Playwright Chromium to draw a small HTML page at the exact pixel size. No network, no new packages.
// Run from the repo root: node scripts/gen-splash.mjs   (add --print to only print the tags)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "site/public/splash");
const tokens = JSON.parse(fs.readFileSync(path.join(root, "brand/tokens.json"), "utf8"));
const mark = fs.readFileSync(path.join(root, "brand/nt-mark-light.svg"), "utf8")
  .replace(/ width="512" height="512"/, ' width="100%" height="100%"');
const paper = tokens.colors.paper;

// CSS size (portrait), pixel ratio, name. Landscape is made for the iPads.
const DEVICES = [
  { id: "iphone-se", w: 375, h: 667, r: 2, landscape: false },
  { id: "iphone-15", w: 393, h: 852, r: 3, landscape: false },
  { id: "iphone-15-pro-max", w: 430, h: 932, r: 3, landscape: false },
  { id: "ipad-mini", w: 744, h: 1133, r: 2, landscape: true },
  { id: "ipad-air", w: 820, h: 1180, r: 2, landscape: true },
];

const shots = [];
for (const d of DEVICES) {
  shots.push({ ...d, orientation: "portrait", file: `${d.id}-portrait.png`, px: [d.w * d.r, d.h * d.r] });
  if (d.landscape) shots.push({ ...d, orientation: "landscape", file: `${d.id}-landscape.png`, px: [d.h * d.r, d.w * d.r] });
}

const tag = (s) =>
  `    <link rel="apple-touch-startup-image" href="/splash/${s.file}" media="(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: ${s.orientation})" />`;

if (!process.argv.includes("--print")) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const s of shots) {
    // The page is drawn in CSS pixels at the device ratio, so the PNG is exactly px[0] x px[1].
    const page = await browser.newPage({ viewport: { width: s.px[0] / s.r, height: s.px[1] / s.r }, deviceScaleFactor: s.r });
    const size = Math.round(Math.min(s.px[0], s.px[1]) / s.r * 0.28);
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:${paper}}
       body{display:grid;place-items:center}div{width:${size}px;height:${size}px}</style><div>${mark}</div>`,
    );
    await page.screenshot({ path: path.join(out, s.file), type: "png" });
    await page.close();
  }
  // Maskable app icon: full-bleed Ink, mark kept inside the central safe zone.
  const icon = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await icon.setContent(
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:${tokens.colors.ink}}
     body{display:grid;place-items:center}div{width:360px;height:360px}</style><div>${mark}</div>`,
  );
  await icon.screenshot({ path: path.join(root, "site/public/icons/icon-maskable-512.png"), type: "png" });
  await browser.close();
}
console.log(shots.map(tag).join("\n"));
