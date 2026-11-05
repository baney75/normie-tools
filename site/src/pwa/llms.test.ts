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
  it("lists every tool, marks only the unfinished ones as coming soon", () => {
    const lines = txt.split("\n").filter((l: string) => l.startsWith("- ") && l.includes("(coming soon)"));
    const soon = index.tools.filter((t: { status: string }) => t.status !== "shipped");
    expect(lines).toHaveLength(soon.length);
    for (const t of index.tools) {
      if (t.status === "shipped") expect(txt).toMatch(new RegExp(`^- ${t.name}$`, "m"));
      else expect(txt).toContain(`- ${t.name} (coming soon)`);
    }
  });
  it("says how many tools are ready", () => {
    const ready = index.tools.filter((t: { status: string }) => t.status === "shipped").length;
    expect(txt).toContain(ready === 0 ? "No tool is ready yet." : `${ready} of ${index.tools.length} tools are ready.`);
  });
  it("has no em or en dashes, and no absolute links", () => {
    expect(txt).not.toMatch(DASH_RE);
    expect(txt).not.toMatch(/https?:\/\//);
  });
});
