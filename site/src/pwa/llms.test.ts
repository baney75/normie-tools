import fs from "node:fs";
import path from "node:path";
import { buildLlmsTxt } from "../../scripts/gen-llms.mjs";

const DASH_RE = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
const pub = path.resolve(__dirname, "../../public");
const txt = fs.readFileSync(path.join(pub, "llms.txt"), "utf8");
const index = JSON.parse(fs.readFileSync(path.join(pub, "tools.json"), "utf8"));

describe("llms.txt", () => {
  it("matches the generator output", () => {
    expect(txt).toBe(buildLlmsTxt(index));
  });
  it("has the H1 and a blockquote", () => {
    expect(txt.startsWith("# NT\n")).toBe(true);
    expect(txt).toMatch(/^> /m);
  });
  it("lists all 76 tools, all coming soon", () => {
    expect(index.tools).toHaveLength(76);
    const lines = txt.split("\n").filter((l: string) => l.startsWith("- ") && l.includes("(coming soon)"));
    expect(lines).toHaveLength(76);
    for (const t of index.tools) expect(txt).toContain(`- ${t.name} (coming soon)`);
  });
  it("has no em or en dashes, and no absolute links", () => {
    expect(txt).not.toMatch(DASH_RE);
    expect(txt).not.toMatch(/https?:\/\//);
  });
});
