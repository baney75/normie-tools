import { describe, it, expect } from "vitest";
import raw from "../../public/tools.json";
import { TOOLS, isUsable, type Tool } from "./tools";

// Add an id here when a tool ships. Nothing else may be "shipped".
const SHIPPED_IDS = ["debt-payoff-planner", "loan-explainer", "loan-offer-compare", "monthly-budget", "mortgage-payment-explainer", "savings-goal-tracker", "student-loan-growth-and-payoff", "unit-converter"];
const EXPECTED_TOTAL = 80;

describe("TOOLS", () => {
  it("matches public/tools.json", () => {
    expect(TOOLS).toEqual(raw.tools);
    expect(TOOLS).toHaveLength(EXPECTED_TOTAL);
  });
  it("uses the expected schema", () => {
    expect(raw.schema).toBe("nt-tools/1");
  });
  it("has unique ids", () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
  });
  it("only listed shipped ids are shipped", () => {
    const shipped = TOOLS.filter((t) => t.status === "shipped").map((t) => t.id).sort();
    expect(shipped).toEqual([...SHIPPED_IDS].sort());
    for (const t of TOOLS) if (!SHIPPED_IDS.includes(t.id)) expect(t.status).toBe("coming_soon");
  });
  it("every shipped tool names its claims file and takes no files unless it says so", () => {
    for (const t of TOOLS.filter((x) => x.status === "shipped")) {
      expect(t.claimsPath).toBe(`tools/${t.id}/claims.json`);
      expect(typeof t.takesFiles).toBe("boolean");
    }
  });
  it("has routes under /tools/", () => {
    for (const t of TOOLS) for (const r of t.routes) expect(r.startsWith("/tools/")).toBe(true);
  });
  it("isUsable is true only for shipped", () => {
    const shipped: Tool = { id: "x", name: "X", status: "shipped", routes: ["/tools/x"] };
    expect(isUsable(shipped)).toBe(true);
    for (const t of TOOLS) expect(isUsable(t)).toBe(SHIPPED_IDS.includes(t.id));
  });
});
