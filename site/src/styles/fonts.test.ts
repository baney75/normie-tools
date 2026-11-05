import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf8");

describe("fonts", () => {
  it("load only from local files", () => {
    const css = read("fonts.css");
    expect(css).not.toMatch(/https?:\/\//);
    expect(css).toContain("fraunces-latin-soft-normal.woff2");
    expect(css).toContain("figtree-latin-wght-normal.woff2");
    expect(read("../../index.html")).not.toMatch(/fonts\.(googleapis|gstatic)/);
  });
  it("built CSS and HTML have no font host, when a build exists", () => {
    const dist = path.resolve(__dirname, "../../dist");
    if (!fs.existsSync(dist)) return;
    const files = [path.join(dist, "index.html"), ...fs.readdirSync(path.join(dist, "assets")).filter((f: string) => f.endsWith(".css")).map((f: string) => path.join(dist, "assets", f))];
    for (const f of files) expect(fs.readFileSync(f, "utf8")).not.toMatch(/fonts\.(googleapis|gstatic)|https?:\/\/[^"')]*font/i);
  });
});
