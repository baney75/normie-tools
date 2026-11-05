import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const pub = path.join(root, "public");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(pub, "manifest.webmanifest"), "utf8"));

function pngSize(file: string): [number, number] {
  const b = fs.readFileSync(file);
  expect(b.subarray(1, 4).toString("ascii"), `${file} is a PNG`).toBe("PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const links = [...html.matchAll(/<link rel="apple-touch-startup-image"[^>]*>/g)].map((m) => {
  const tag = m[0];
  const href = /href="([^"]+)"/.exec(tag)![1];
  const media = /media="([^"]+)"/.exec(tag)![1];
  const num = (re: RegExp) => Number(re.exec(media)![1]);
  return {
    href,
    w: num(/device-width: (\d+)px/),
    h: num(/device-height: (\d+)px/),
    ratio: num(/-webkit-device-pixel-ratio: (\d+)/),
    orientation: /orientation: (portrait|landscape)/.exec(media)![1],
  };
});

describe("iOS splash screens", () => {
  it("covers the phone and iPad sizes in the device matrix", () => {
    const key = (l: (typeof links)[number]) => `${l.w}x${l.h}@${l.ratio} ${l.orientation}`;
    const have = links.map(key);
    for (const want of [
      "375x667@2 portrait",
      "393x852@3 portrait",
      "430x932@3 portrait",
      "744x1133@2 portrait",
      "744x1133@2 landscape",
      "820x1180@2 portrait",
      "820x1180@2 landscape",
    ]) {
      expect(have).toContain(want);
    }
  });

  it("points every tag at a file with the right pixel size", () => {
    expect(links.length).toBeGreaterThanOrEqual(7);
    for (const l of links) {
      const file = path.join(pub, l.href.replace(/^\.\//, ""));
      expect(fs.existsSync(file), `${l.href} exists`).toBe(true);
      const px: [number, number] = l.orientation === "portrait" ? [l.w * l.ratio, l.h * l.ratio] : [l.h * l.ratio, l.w * l.ratio];
      expect(pngSize(file), l.href).toEqual(px);
      expect(fs.statSync(file).size, `${l.href} stays small`).toBeLessThan(100_000);
    }
  });

  it("has no unreferenced splash file", () => {
    const used = new Set(links.map((l) => path.basename(l.href)));
    for (const f of fs.readdirSync(path.join(pub, "splash"))) expect(used.has(f), f).toBe(true);
  });
});

describe("manifest installability", () => {
  it("has the fields an install prompt needs", () => {
    for (const k of ["name", "short_name", "start_url", "theme_color", "background_color"]) {
      expect(typeof manifest[k], k).toBe("string");
      expect(manifest[k].length, k).toBeGreaterThan(0);
    }
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("has 192, 512 and a maskable icon, all real files at the stated size", () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    const maskable = manifest.icons.filter((i: { purpose?: string }) => (i.purpose ?? "").split(" ").includes("maskable"));
    expect(maskable.length).toBeGreaterThan(0);
    for (const i of manifest.icons as { src: string; sizes: string }[]) {
      const [w, h] = i.sizes.split("x").map(Number);
      expect(pngSize(path.join(pub, i.src)), i.src).toEqual([w, h]);
    }
  });

  it("links the manifest and the theme color in index.html", () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain(`name="theme-color" content="${manifest.theme_color}"`);
  });
});
