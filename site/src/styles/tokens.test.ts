import fs from "node:fs";
import path from "node:path";
import { buildTokensCss } from "../../scripts/gen-tokens.mjs";

const root = path.resolve(__dirname, "../../..");
const json = JSON.parse(fs.readFileSync(path.join(root, "brand/tokens.json"), "utf8"));
const committed = fs.readFileSync(path.resolve(__dirname, "tokens.css"), "utf8");

describe("tokens.css", () => {
  it("matches the generator output", () => {
    expect(committed).toBe(buildTokensCss(json));
  });
  it("contains every color from tokens.json", () => {
    for (const [name, value] of Object.entries<string>(json.colors)) {
      expect(committed).toContain(`--nt-${name}: ${value};`);
    }
  });
  it("keeps tap targets at 44px or more", () => {
    const m = /--nt-tap:\s*([\d.]+)rem/.exec(committed);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1]) * 16).toBeGreaterThanOrEqual(44);
  });
  it("does not claim IBM Plex Mono", () => {
    expect(committed).not.toMatch(/--nt-font-code:[^;]*Plex/);
  });
});
