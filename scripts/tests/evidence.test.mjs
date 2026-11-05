import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkTool } from "../check-evidence.mjs";

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nt-evidence-"));
  for (const [f, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), JSON.stringify(data));
  }
  return root;
}

const pass8 = Array(8).fill("PASS");
const goodReview = { firstTimeUser: { score: 4 }, designRubric: [{ model: "haiku", rules: pass8 }, { model: "sonnet", rules: pass8 }] };
const goodEval = { verdict: { ok: true } };
const files = (over = {}) => ({
  "tests/model-review/t.json": goodReview,
  "tests/skill-evals/results/t/tiny.json": goodEval,
  "tests/skill-evals/results/t/haiku.json": goodEval,
  "tests/skill-evals/results/t/sonnet.json": goodEval,
  ...over,
});

test("evidence: clean records pass", () => {
  assert.deepEqual(checkTool(repo(files()), { id: "t" }), []);
});

test("evidence: no records means it cannot stay shipped", () => {
  const out = checkTool(repo({}), { id: "t" });
  assert.ok(out.some((m) => /no model review record/.test(m)));
  assert.ok(out.some((m) => /no skill-eval result for tiny/.test(m)));
});

test("evidence: a first-time-user score of 3 fails", () => {
  const out = checkTool(repo(files({ "tests/model-review/t.json": { ...goodReview, firstTimeUser: { score: 3 } } })), { id: "t" });
  assert.ok(out.some((m) => /needs 4 or more/.test(m)));
});

test("evidence: one failed rubric rule fails, rule 1 included", () => {
  const rules = ["FAIL", ...pass8.slice(1)];
  const out = checkTool(repo(files({ "tests/model-review/t.json": { ...goodReview, designRubric: [{ model: "haiku", rules }] } })), { id: "t" });
  assert.ok(out.some((m) => /not 8 of 8: rule1/.test(m)));
});

test("evidence: every extra screen is checked too", () => {
  const review = { ...goodReview, otherScreens: [{ screen: "empty", firstTimeUser: { score: 2 }, designRubric: goodReview.designRubric }] };
  const out = checkTool(repo(files({ "tests/model-review/t.json": review })), { id: "t" });
  assert.ok(out.some((m) => /\(empty\) is 2/.test(m)));
});

test("evidence: a skill-eval below the bar fails", () => {
  const out = checkTool(repo(files({ "tests/skill-evals/results/t/tiny.json": { verdict: { ok: false, fails: ["level 1: 80% < 90%"] } } })), { id: "t" });
  assert.ok(out.some((m) => /tiny is below the bar/.test(m)));
});

test("evidence: a screen with no Sonnet review fails", () => {
  const review = { ...goodReview, designRubric: [{ model: "haiku", rules: pass8 }] };
  const out = checkTool(repo(files({ "tests/model-review/t.json": review })), { id: "t" });
  assert.ok(out.some((m) => /\(main\) has no sonnet review/.test(m)));
});

test("evidence: an extra screen with no Haiku review fails", () => {
  const review = { ...goodReview, otherScreens: [{ screen: "empty", firstTimeUser: { score: 5 }, designRubric: [{ model: "sonnet", rules: pass8 }] }] };
  const out = checkTool(repo(files({ "tests/model-review/t.json": review })), { id: "t" });
  assert.ok(out.some((m) => /\(empty\) has no haiku review/.test(m)));
});
