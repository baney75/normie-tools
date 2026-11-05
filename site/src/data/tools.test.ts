import { describe, it, expect } from "vitest";
import raw from "../../public/tools.json";
import { TOOLS, isUsable, type Tool } from "./tools";

describe("TOOLS", () => {
  it("matches public/tools.json", () => {
    expect(TOOLS).toEqual(raw.tools);
    expect(TOOLS).toHaveLength(76);
  });
  it("uses the expected schema", () => {
    expect(raw.schema).toBe("nt-tools/1");
  });
  it("has unique ids", () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
  });
  it("is all coming soon this round", () => {
    for (const t of TOOLS) expect(t.status).toBe("coming_soon");
  });
  it("has routes under /tools/", () => {
    for (const t of TOOLS) for (const r of t.routes) expect(r.startsWith("/tools/")).toBe(true);
  });
  it("isUsable is true only for shipped", () => {
    const shipped: Tool = { id: "x", name: "X", status: "shipped", routes: ["/tools/x"] };
    expect(isUsable(shipped)).toBe(true);
    for (const t of TOOLS) expect(isUsable(t)).toBe(false);
  });
});
