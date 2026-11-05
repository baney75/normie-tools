import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "vite";

// Builds the site into a temp folder and checks the real output is ready for https://dbaney.com/nt/.
const root = path.resolve(__dirname, "../..");
let out = "";
let html = "";

beforeAll(async () => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), "nt-base-"));
  await build({ root, logLevel: "silent", build: { outDir: out, emptyOutDir: true } });
  html = fs.readFileSync(path.join(out, "index.html"), "utf8");
}, 120_000);

afterAll(() => {
  if (out) fs.rmSync(out, { recursive: true, force: true });
});

describe("built site under /nt/", () => {
  it("points every file URL in index.html at /nt/", () => {
    const urls = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(10);
    for (const u of urls) expect(u.startsWith("/nt/"), u).toBe(true);
    expect(html).toContain('href="/nt/manifest.webmanifest"');
    expect(html).toMatch(/src="\/nt\/assets\/[^"]+\.js"/);
  });
  it("has the built manifest scope and start URL at /nt/", () => {
    const m = JSON.parse(fs.readFileSync(path.join(out, "manifest.webmanifest"), "utf8"));
    expect(m.scope).toBe("/nt/");
    expect(m.start_url).toBe("/nt/");
  });
  it("ships the worker, the asset list and files that exist for every URL in the page", () => {
    expect(fs.existsSync(path.join(out, "sw.js"))).toBe(true);
    const list = JSON.parse(fs.readFileSync(path.join(out, "asset-manifest.json"), "utf8"));
    expect(Object.keys(list).length).toBeGreaterThan(1);
    for (const m of html.matchAll(/(?:href|src)="\/nt\/([^"#]+)"/g)) {
      expect(fs.existsSync(path.join(out, m[1])), m[1]).toBe(true);
    }
  });
});
