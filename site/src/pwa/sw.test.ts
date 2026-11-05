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
      start_url: "./",
      scope: "./",
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
});
