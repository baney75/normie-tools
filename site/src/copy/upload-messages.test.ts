import path from "node:path";
import { describe, it, expect } from "vitest";
import { gradeOf } from "../../../scripts/check-reading-level.mjs";
import { loadTerms, buildMatchers } from "../../../scripts/check-banned-jargon.mjs";
import {
  allMessages,
  messageFor,
  wrongDocument,
  formatSize,
  canReadDirectly,
  PLAIN_KINDS,
  type UploadMessage,
} from "./upload-messages";

const root = path.resolve(__dirname, "../../..");
const textOf = (m: UploadMessage) =>
  [m.gave, m.needs, m.explainer, m.alternative && `${m.alternative.label}.`, m.alternative?.note, `${m.howTo.text}.`]
    .filter(Boolean)
    .join(" ");

describe("messageFor common cases", () => {
  it("PDF where CSV is needed", () => {
    const m = messageFor({ detected: "pdf", needed: "csv" });
    expect(m.gave).toBe("This is a PDF bank statement.");
    expect(m.needs).toContain("CSV");
    expect(m.alternative?.label).toBe("Read my PDF statement instead");
    expect(m.accepted).toBe(false);
  });
  it("photo", () => {
    for (const k of ["jpeg", "png", "heic"] as const) {
      const m = messageFor({ detected: k, needed: "pdf" });
      expect(m.gave).toBe("This is a photo.");
      expect(m.alternative?.label).toBe("Read the photo");
    }
  });
  it("xlsx and qfx are read directly", () => {
    for (const k of ["xlsx", "qfx", "ofx"] as const) {
      const m = messageFor({ detected: k, needed: "csv" });
      expect(m.accepted).toBe(true);
      expect(canReadDirectly(k, "csv")).toBe(true);
    }
    expect(messageFor({ detected: "qfx", needed: "csv" }).gave).toContain("money-app file (QFX)");
  });
  it("Word where PDF is needed", () => {
    const m = messageFor({ detected: "docx", needed: "pdf" });
    expect(m.gave).toBe("This is a Word document.");
    expect(m.alternative?.action).toBe("convert-to-pdf");
  });
  it("empty and damaged offer Try again", () => {
    expect(messageFor({ detected: "empty", needed: "pdf" }).tryAgain).toBe(true);
    const d = messageFor({ detected: "pdf", needed: "pdf", flags: { damaged: true } });
    expect(d.tryAgain).toBe(true);
    expect(d.gave).toContain("damaged");
  });
  it("password locked asks for a password", () => {
    const m = messageFor({ detected: "pdf", needed: "pdf", flags: { encrypted: true } });
    expect(m.askPassword).toBe(true);
    expect(m.explainer).toContain("NT won't keep it");
  });
  it("too big shows size text", () => {
    const m = messageFor({ detected: "pdf", needed: "pdf", sizeBytes: 2_100_000_000, maxBytes: 100_000_000, flags: { syncOn: true } });
    expect(m.gave).toContain("2.1 GB");
    expect(m.alternative?.label).toBe("Send to my computer");
    const small = messageFor({ detected: "pdf", needed: "pdf", sizeBytes: 5_500_000, maxBytes: 1_000_000 });
    expect(small.gave).toContain("5.5 MB");
    expect(small.alternative).toBeUndefined();
    expect(formatSize(250_000_000)).toBe("250 MB");
  });
  it("wrong document", () => {
    const m = wrongDocument("w-2", "1099");
    expect(m.gave).toBe("This is a W-2, the form from an employer.");
    expect(m.needs).toContain("a 1099");
    expect(m.alternative?.label).toContain("W-2");
    const other = wrongDocument("1099-k", "w-2");
    expect(other.alternative).toBeUndefined();
    expect(other.gave).toContain("1099-K");
  });
  it("name mismatch", () => {
    const m = messageFor({ detected: "pdf", needed: "csv", name: "statement.csv", flags: { mismatch: true } });
    expect(m.gave).toBe("This file is named .csv, but it is really a PDF inside.");
    expect(m.alternative).toBeDefined();
  });
  it("unknown type", () => {
    const m = messageFor({ detected: "unknown", needed: "csv" });
    expect(m.gave).toBe("NT can't tell what kind of file this is.");
    expect(m.alternative).toBeUndefined();
    expect(m.needs).toContain("CSV");
  });
  it("CSV with unknown bank layout", () => {
    const m = messageFor({ detected: "csv", needed: "csv", flags: { unknownLayout: true } });
    expect(m.gave).toContain("doesn't know this bank's layout");
    expect(m.alternative?.action).toBe("pick-columns");
  });
  it("a missing pair falls back to the generic template", () => {
    const m = messageFor({ detected: "gif", needed: "docx" });
    expect(m.id).toBe("generic:gif>docx");
    expect(m.gave).toBe("This is a picture.");
    expect(m.needs).toBe("This tool needs a Word document.");
    expect(m.explainer.length).toBeGreaterThan(0);
    expect(m.howTo.href).toBeTruthy();
    const odd = messageFor({ detected: "zip", needed: "unknown" });
    expect(odd.explainer).toBe("That is the kind of file this step can read.");
  });
  it("has a word for every kind", () => {
    expect(Object.keys(PLAIN_KINDS)).toContain("legacy-office");
  });
});

describe("every message", () => {
  const all = allMessages();
  it("has the parts", () => {
    expect(all.length).toBeGreaterThan(20);
    for (const m of all) {
      expect(m.gave.length).toBeGreaterThan(0);
      expect(m.needs.length).toBeGreaterThan(0);
      expect(m.explainer.length).toBeGreaterThan(0);
      expect(m.howTo.text.length).toBeGreaterThan(0);
      expect(m.howTo.href.startsWith("#/")).toBe(true);
    }
  });
  it("has short sentences", () => {
    for (const m of all) {
      const sentences = textOf(m).split(/(?<=[.!?])\s+/);
      for (const s of sentences) expect(s.split(/\s+/).length, s).toBeLessThan(15);
    }
  });
  it("has no blame, dashes or harsh words", () => {
    const joined = all.map(textOf).join("\n");
    expect(joined).not.toMatch(/you uploaded|wrong file|invalid|error/i);
    expect(joined).not.toMatch(new RegExp(`[${String.fromCodePoint(0x2014)}${String.fromCodePoint(0x2013)}]`));
  });
  it("reads at grade 7 or lower", () => {
    const joined = all.map((m) => textOf(m)).join("\n\n");
    const g = gradeOf(joined);
    expect(g).not.toBeNull();
    expect(g!.grade).toBeLessThanOrEqual(7.0);
  });
  it("has no banned glossary term", () => {
    // CSV and PDF are allowed: they come with a plain explainer.
    const terms = loadTerms(root).filter((t) => t.toLowerCase() !== "csv" && t.toLowerCase() !== "pdf");
    const matchers = buildMatchers(terms);
    expect(terms.length).toBeGreaterThan(10);
    for (const m of all) {
      const text = textOf(m);
      for (const { term, re } of matchers) expect(re.test(text), `${term} in ${text}`).toBe(false);
    }
  });
});
