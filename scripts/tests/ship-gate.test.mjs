import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "../ship-gate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const gate = path.join(root, "scripts", "ship-gate.mjs");

function cli(...args) {
  return spawnSync(process.execPath, [gate, ...args], { cwd: root, encoding: "utf8" });
}

test("ship-gate: exits zero on the real manifest", () => {
  const r = cli();
  assert.equal(r.status, 0, r.stderr);
});

test("ship-gate: real manifest has no dummy tool and no shipped tool yet", () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, "site/public/tools.json"), "utf8"));
  assert.ok(!m.tools.some((t) => t.id === "ship-gate-dummy"));
  assert.ok(m.tools.every((t) => t.status === "coming_soon"));
});

test("ship-gate: exits non-zero when the dummy fixture is enabled, with plain messages", () => {
  const r = cli("--manifest", "tests/fixtures/ship-gate-dummy/manifest.json");
  assert.notEqual(r.status, 0);
  for (const phrase of ["page-claims file is missing", "no accuracy tests", "no reliability suite", "no phone-size e2e", "upload-error contract", "no recorded test run"]) {
    assert.ok(r.stderr.includes(phrase), `missing message: ${phrase}\n${r.stderr}`);
  }
});

function tempRepo(record) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nt-gate-"));
  const put = (name, body) => {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  };
  put("site/public/tools.json", JSON.stringify({ tools: [{ id: "t1", name: "T1", status: "shipped", takesFiles: true, claimsPath: "tools/t1/page-claims.json" }] }));
  put("tools/t1/page-claims.json", JSON.stringify({ claims: [{ id: "c1", text: "a" }, { id: "c2", text: "b" }] }));
  put("tools/t1/tests/accuracy.test.mjs", "// c1 c2\n");
  put("tools/t1/tests/reliability.test.mjs", "// messy inputs\n");
  put("tools/t1/tests/upload-errors.test.mjs", "//\n");
  put("site/e2e/t1.spec.ts", "use({ viewport: { width: 390, height: 844 } })\n");
  if (record) put("tools/t1/ship-record.json", JSON.stringify(record));
  return dir;
}

test("ship-gate: a complete shipped tool with a 100% record passes", () => {
  assert.deepEqual(run(tempRepo({ passed: 12, total: 12 })), []);
});

test("ship-gate: a record under 100% fails", () => {
  const f = run(tempRepo({ passed: 11, total: 12 }));
  assert.equal(f.length, 1);
  assert.match(f[0], /not 100%/);
});

test("ship-gate: an unnamed claim in the accuracy tests fails", () => {
  const dir = tempRepo({ passed: 1, total: 1 });
  fs.writeFileSync(path.join(dir, "tools/t1/tests/accuracy.test.mjs"), "// c1 only\n");
  const f = run(dir);
  assert.equal(f.length, 1);
  assert.match(f[0], /claim "c2"/);
});
