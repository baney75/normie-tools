import path from "node:path";
import { gradeOf } from "../../../scripts/check-reading-level.mjs";
import { loadTerms, buildMatchers } from "../../../scripts/check-banned-jargon.mjs";
import { MAX_SENTENCE, MAX_AVG_SENTENCE } from "../../../scripts/check-no-clutter.mjs";
import { sentencesOf, wordsOf } from "../../../scripts/lib/prose.mjs";
import { PAGES } from "./pages";

const DASH_RE = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
const root = path.resolve(__dirname, "../../..");
const MAX_PARAGRAPH = 50; // the rule says split a paragraph over about 50 words

// Exact phrases the plan requires, exempt from the jargon match only.
const ALLOWED = [
  "Point your agent here", // exact page title in plan/v5-work/agents-skills-tools.md
  "Use them yourself, or ask your AI app.", // brand subline
];

function strings(node: unknown, key = ""): string[] {
  if (typeof node === "string") return key === "file" ? [] : [node];
  if (Array.isArray(node)) return node.flatMap((n) => strings(n));
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => (k === "builders" ? [] : strings(v, k)));
  }
  return [];
}

const all = strings(PAGES);
const visible = all.map((s) => ALLOWED.reduce((acc, a) => acc.split(a).join(""), s));
const matchers = buildMatchers(loadTerms(root));

describe("page copy", () => {
  it("has strings to check", () => {
    expect(all.length).toBeGreaterThan(30);
  });
  it("has no em or en dashes", () => {
    for (const s of all) expect(s).not.toMatch(DASH_RE);
  });
  it("uses no banned term", () => {
    for (const s of visible) {
      for (const { term, re } of matchers) {
        if (re.test(s)) throw new Error(`banned term "${term}" in: ${s}`);
      }
    }
  });
  it("reads at grade 7 or lower", () => {
    const g = gradeOf(all.join("\n\n"));
    expect(g!.grade).toBeLessThanOrEqual(7.0);
  });
  it("keeps sentences and paragraphs short", () => {
    let total = 0;
    let n = 0;
    for (const s of all) {
      const pw = wordsOf(s).length;
      expect(pw).toBeLessThanOrEqual(MAX_PARAGRAPH);
      for (const sent of sentencesOf({ text: s })) {
        const w = wordsOf(sent).length;
        expect(w).toBeLessThanOrEqual(MAX_SENTENCE);
        total += w;
        n++;
      }
    }
    expect(total / n).toBeLessThanOrEqual(MAX_AVG_SENTENCE);
  });
  it("keeps sentences under 15 words where the brief asks", () => {
    for (const s of all) {
      for (const sent of sentencesOf({ text: s })) {
        expect(wordsOf(sent).length, sent).toBeLessThanOrEqual(15);
      }
    }
  });
});
