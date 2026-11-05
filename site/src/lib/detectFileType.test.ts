import { describe, it, expect } from "vitest";
import { detectFileType } from "./detectFileType";

const enc = (s: string) => new TextEncoder().encode(s);
function make(parts: (string | number[])[], name?: string): Blob & { name?: string } {
  const chunks = parts.map((p) => (typeof p === "string" ? enc(p) : new Uint8Array(p)));
  const b = new Blob(chunks as BlobPart[]) as Blob & { name?: string };
  if (name) Object.defineProperty(b, "name", { value: name });
  return b;
}

const pdfOk = ["%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"];
const eocd = [0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function zipStub(entries: string[], flags = 0, withEnd = true) {
  const parts: (string | number[])[] = [];
  for (const e of entries) {
    parts.push([0x50, 0x4b, 0x03, 0x04, 20, 0, flags, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, e.length, 0, 0, 0]);
    parts.push(e);
  }
  if (withEnd) parts.push(eocd);
  return parts;
}

describe("detectFileType", () => {
  it("finds a PDF", async () => {
    const d = await detectFileType(make(pdfOk, "a.pdf"));
    expect(d.kind).toBe("pdf");
    expect(d.mismatch).toBe(false);
    expect(d.encrypted).toBe(false);
    expect(d.damaged).toBe(false);
  });
  it("flags a renamed PDF named .csv", async () => {
    const d = await detectFileType(make(pdfOk, "statement.csv"));
    expect(d.kind).toBe("pdf");
    expect(d.hintFromName).toBe("csv");
    expect(d.mismatch).toBe(true);
  });
  it("finds an empty file", async () => {
    const d = await detectFileType(make([], "x.csv"));
    expect(d.kind).toBe("empty");
    expect(d.mismatch).toBe(false);
  });
  it("flags a truncated PDF as damaged", async () => {
    const d = await detectFileType(make(["%PDF-1.4\n1 0 obj\n<<>>"], "a.pdf"));
    expect(d.kind).toBe("pdf");
    expect(d.damaged).toBe(true);
  });
  it("flags a truncated PNG and a whole one", async () => {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect((await detectFileType(make([sig, "xxxx"]))).damaged).toBe(true);
    const ok = await detectFileType(make([sig, "xxxxIEND®B`\u0082"]));
    expect(ok.kind).toBe("png");
    expect(ok.damaged).toBe(false);
  });
  it("finds a JPEG", async () => {
    const d = await detectFileType(make([[0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]], "p.jpg"));
    expect(d.kind).toBe("jpeg");
    expect(d.damaged).toBe(false);
  });
  it("detects an encrypted PDF stub", async () => {
    const d = await detectFileType(make(["%PDF-1.7\n<< /Encrypt 5 0 R >>\n%%EOF"]));
    expect(d.encrypted).toBe(true);
  });
  it("finds a HEIC ftyp box", async () => {
    const d = await detectFileType(make([[0, 0, 0, 24], "ftypheic", [0, 0, 0, 0], "mif1heic"], "IMG.HEIC"));
    expect(d.kind).toBe("heic");
    expect(d.mismatch).toBe(false);
  });
  it("finds docx, xlsx and pptx stubs", async () => {
    expect((await detectFileType(make(zipStub(["[Content_Types].xml", "word/document.xml"])))).kind).toBe("docx");
    expect((await detectFileType(make(zipStub(["[Content_Types].xml", "xl/workbook.xml"])))).kind).toBe("xlsx");
    expect((await detectFileType(make(zipStub(["[Content_Types].xml", "ppt/slides/s.xml"])))).kind).toBe("pptx");
  });
  it("calls a docx named .pdf a mismatch", async () => {
    const d = await detectFileType(make(zipStub(["[Content_Types].xml", "word/document.xml"]), "form.pdf"));
    expect(d.mismatch).toBe(true);
  });
  it("finds a plain zip and its encrypted flag", async () => {
    const d = await detectFileType(make(zipStub(["a.txt"], 1)));
    expect(d.kind).toBe("zip");
    expect(d.encrypted).toBe(true);
  });
  it("flags a cut-off zip as damaged", async () => {
    const d = await detectFileType(make(zipStub(["[Content_Types].xml", "word/document.xml"], 0, false)));
    expect(d.damaged).toBe(true);
  });
  it("finds legacy Office and its encrypted form", async () => {
    const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    expect((await detectFileType(make([sig, "stuff"], "a.doc"))).kind).toBe("legacy-office");
    const enc2 = await detectFileType(make([sig, "EncryptionInfo"], "a.docx"));
    expect(enc2.encrypted).toBe(true);
    expect(enc2.mismatch).toBe(true);
  });
  it("finds OFX and QFX", async () => {
    const text = "OFXHEADER:100\nDATA:OFXSGML\n<OFX>\n</OFX>\n";
    expect((await detectFileType(make([text], "a.ofx"))).kind).toBe("ofx");
    const q = await detectFileType(make([text], "bank.qfx"));
    expect(q.kind).toBe("qfx");
    expect(q.label).toContain("money-app file (QFX)");
    expect(q.mismatch).toBe(false);
  });
  it("finds a CSV with commas, semicolons and tabs", async () => {
    for (const d of [",", ";", "\t"]) {
      const text = `Date${d}Description${d}Amount\n2026-01-01${d}Coffee${d}-4.50\n2026-01-02${d}Pay${d}100.00\n`;
      expect((await detectFileType(make([text], "s.csv"))).kind).toBe("csv");
    }
  });
  it("calls plain prose text", async () => {
    const d = await detectFileType(make(["Hello there.\nThis is a note.\n"], "n.txt"));
    expect(d.kind).toBe("text");
    expect(d.mismatch).toBe(false);
  });
  it("calls random binary unknown", async () => {
    const d = await detectFileType(make([[0, 1, 2, 3, 250, 251, 0, 9, 8, 7]], "x.csv"));
    expect(d.kind).toBe("unknown");
  });
});
