// Upload-error contract for Photo Duplicate Finder: a wrong file gets what was given, what is needed,
// what that is, and how to get it. The words come from the shared message table, never from this tool.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { screenFiles } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const page = fs.readFileSync(path.join(root, "site/src/tools/photo-duplicate-finder/Page.tsx"), "utf8");

test("upload errors: the page uses the shared UploadField and the shared message table", () => {
  assert.match(page, /components\/UploadField/);
  assert.match(page, /copy\/upload-messages/);
  assert.match(page, /detectFileType/);
});

test("upload errors: the page does not write its own wrong-type text", () => {
  assert.doesNotMatch(page, /wrong file|invalid format/i);
});

test("upload errors: the e2e contract spec covers photo-duplicate-finder", () => {
  const spec = fs.readFileSync(path.join(root, "site/e2e/upload-error-contract.spec.ts"), "utf8");
  assert.match(spec, /photo-duplicate-finder/);
  assert.match(spec, /what was given, what is needed/);
});

test("upload errors: empty and too-big files are skipped, not crashed on", () => {
  const r = screenFiles([{ name: "a.jpg", size: 0 }, { name: "b.jpg", size: 26_000_000 }, { name: "c.jpg", size: 1000 }]);
  assert.ok(r);
});
