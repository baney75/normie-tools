import fs from "node:fs";
import path from "node:path";

const pub = path.resolve(__dirname, "../../public");
const sw = fs.readFileSync(path.join(pub, "sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(pub, "manifest.webmanifest"), "utf8"));

function pngSize(file: string) {
  const b = fs.readFileSync(file);
  expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe("manifest", () => {
  it("has the required fields", () => {
    expect(manifest).toMatchObject({
      name: "NT",
      short_name: "NT",
      description: "Small tools for everyday things.",
      start_url: "/nt/",
      scope: "/nt/",
      display: "standalone",
      background_color: "#F7F2E8",
      theme_color: "#134E3A",
    });
  });
  it("lists real icons at the stated sizes", () => {
    for (const size of [192, 512]) {
      const icon = manifest.icons.find((i: { sizes: string }) => i.sizes === `${size}x${size}`);
      expect(icon).toBeTruthy();
      expect(pngSize(path.join(pub, icon.src))).toEqual([size, size]);
    }
    expect(pngSize(path.join(pub, "icons/favicon-32.png"))).toEqual([32, 32]);
  });
});

describe("sw.js", () => {
  it("has no timers or cross-origin handling", () => {
    expect(sw).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    expect(sw).toContain("self.location.origin");
  });
  it("precaches the shell and tools.json", () => {
    expect(sw).toContain('"nt-shell-v1"');
    for (const f of ["./", "./index.html", "./manifest.webmanifest", "./tools.json", "./llms.txt"]) {
      expect(sw).toContain(`"${f}"`);
    }
  });
  it("handles install, activate and fetch", () => {
    for (const ev of ["install", "activate", "fetch"]) {
      expect(sw).toContain(`addEventListener("${ev}"`);
    }
    expect(sw).toContain("skipWaiting");
    expect(sw).toContain("clients.claim");
    expect(sw).toContain("caches.delete");
  });
  it("saves the lazy tool pages through the build asset list", () => {
    expect(sw).toContain("./asset-manifest.json");
    expect(sw).toContain("e.css");
    expect(sw).toContain("e.assets");
    const cfg = fs.readFileSync(path.resolve(__dirname, "../../vite.config.ts"), "utf8");
    expect(cfg).toContain('manifest: "asset-manifest.json"');
  });
  it("ignores Vary when it looks up a saved file (the preview server sends Vary: Origin)", () => {
    expect(sw.match(/ignoreVary: true/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("does not let one missing build file stop the install", () => {
    expect(sw).toMatch(/c\.add\(f\)\.catch/);
  });
  it("lists only files that exist in public/", () => {
    const list = /const PRECACHE = \[([\s\S]*?)\];/.exec(sw)![1];
    const files = [...list.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter((f) => f && f !== "index.html"); // index.html is the Vite entry, not in public/
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) expect(fs.existsSync(path.join(pub, f)), f).toBe(true);
  });
  it("saves every splash file named in index.html", () => {
    const html = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
    const hrefs = [...html.matchAll(/rel="apple-touch-startup-image" href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(7);
    for (const h of hrefs) expect(sw).toContain(`".${h}"`); // index.html uses root paths, Vite adds /nt/; the worker uses paths relative to itself
  });
  it("answers any page request offline with the saved shell", () => {
    expect(sw).toContain('req.mode === "navigate"');
    expect(sw).toContain('caches.match("./index.html"');
  });
});

describe("served under /nt/", () => {
  it("registers the worker with the /nt/ scope", () => {
    const main = fs.readFileSync(path.resolve(__dirname, "../main.tsx"), "utf8");
    expect(main).toContain("import.meta.env.BASE_URL}sw.js");
    expect(main).toContain("scope: import.meta.env.BASE_URL");
  });
  it("keeps worker file paths relative to sw.js, which sits in /nt/", () => {
    expect(sw).not.toMatch(/"\/[a-z]/);
  });
});
