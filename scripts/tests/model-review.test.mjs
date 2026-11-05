import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPrompts, modelOf } from "../../tests/model-review/run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = path.join(root, "tests", "model-review");

test("model-review: both prompts exist and are pinned to their hash", () => {
  const pinned = JSON.parse(fs.readFileSync(path.join(dir, "prompts.sha256.json"), "utf8"));
  const now = hashPrompts();
  assert.deepEqual(Object.keys(now), ["design-rubric.md", "first-time-user.md"]);
  assert.deepEqual(now, pinned, "prompt changed: review it, then run node tests/model-review/run.mjs --pin");
});

test("model-review: prompts name their model and ask for a RESULT line", () => {
  assert.equal(modelOf("first-time-user"), "sonnet");
  assert.equal(modelOf("design-rubric"), "haiku");
  for (const n of ["first-time-user", "design-rubric"]) {
    assert.match(fs.readFileSync(path.join(dir, "prompts", `${n}.md`), "utf8"), /RESULT:/);
  }
});

test("model-review: harness is not wired into the default test run", () => {
  const runAll = fs.readFileSync(path.join(root, "scripts", "run-all.mjs"), "utf8");
  assert.ok(!runAll.includes("model-review/run"));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(!pkg.scripts.test.includes("model-review/run"));
});
