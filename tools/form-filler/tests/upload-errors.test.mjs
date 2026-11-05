// Upload-error contract for Form Filler: a wrong file gets what was given, what is needed,
// what that is, and how to get it. The words come from the shared message table, never from this tool.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSaved } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const page = fs.readFileSync(path.join(root, "site/src/tools/form-filler/Page.tsx"), "utf8");

test("upload errors: the page uses the shared UploadField for the saved answer file", () => {
  assert.match(page, /<UploadField[^>]*needed="text"/);
  assert.match(page, /components\/UploadField/);
});

test("upload errors: the page does not write its own wrong-type text", () => {
  assert.doesNotMatch(page, /wrong file|invalid format/i);
});

test("upload errors: the e2e contract spec covers form-filler", () => {
  const spec = fs.readFileSync(path.join(root, "site/e2e/upload-error-contract.spec.ts"), "utf8");
  assert.match(spec, /form-filler/);
  assert.match(spec, /what was given, what is needed/);
});

test("upload errors: a text file that is not an answer file is refused in plain words", () => {
  for (const text of ["date,amount\n2026-01-02,12.50\n", "%PDF-1.4\n%%EOF", "just a note", ""]) {
    const r = parseSaved(text);
    assert.equal(r.ok, false);
    assert.match(r.problems[0].message, /^This (is not an answer file from Form Filler|file is empty)\.$/);
  }
});
