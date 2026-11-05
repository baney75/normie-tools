import { describe, it, expect } from "vitest";
import { TOOLS } from "../data/tools";
import { searchTools } from "./searchTools";

const names = (q: string) => searchTools(q, TOOLS).map((t) => t.name);

describe("searchTools", () => {
  it("returns nothing for an empty or all-stopword query", () => {
    expect(searchTools("", TOOLS)).toEqual([]);
    expect(searchTools("   ", TOOLS)).toEqual([]);
    expect(searchTools("I want to", TOOLS)).toEqual([]);
  });
  it("finds receipts", () => {
    const r = names("scan my receipts");
    expect(r).toContain("Receipt to Spreadsheet");
    expect(r[0]).toBe("Receipt to Spreadsheet");
  });
  it("finds photo and PDF tools", () => {
    const r = names("turn my photo into a pdf");
    expect(r).toContain("PDF Combine and Shrink");
    expect(r).toContain("Phone Photo to Scan");
    expect(r).toContain("ID Photo Maker");
  });
  it("is case insensitive and ignores plural endings", () => {
    expect(names("TAXES")).toEqual(names("tax"));
    expect(names("tax")).toContain("Tax Filing Helper");
    expect(names("saving")).toContain("Savings Goal Tracker");
  });
  it("matches the group", () => {
    expect(names("safety")).toContain("Scam Check");
  });
  it("keeps list order for equal scores", () => {
    const r = searchTools("converter", TOOLS).map((t) => TOOLS.indexOf(t));
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });
  it("returns nothing when nothing matches", () => {
    expect(names("zzzzqq")).toEqual([]);
  });
});
