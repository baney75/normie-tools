import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkTool, checkToolDetailed, waiverFileProblems, waiverProblem } from "../check-evidence.mjs";

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

const screen = (name) => ({ screen: name, ...goodReview });
const listed = { "tests/model-review/scenes/screens.json": { t: ["empty", "step2", "answer"] } };

test("evidence: a tool in screens.json passes when every listed screen is reviewed", () => {
  const review = { ...goodReview, screens: ["empty", "step2", "answer"], otherScreens: [screen("empty"), screen("step2")] };
  assert.deepEqual(checkTool(repo(files({ ...listed, "tests/model-review/t.json": review })), { id: "t" }), []);
});

test("evidence: a record that skips a listed screen fails, even when every screen it has is clean", () => {
  const review = { ...goodReview, screens: ["empty", "answer"], otherScreens: [screen("empty")] };
  const out = checkTool(repo(files({ ...listed, "tests/model-review/t.json": review })), { id: "t" });
  assert.ok(out.some((m) => /does not cover every screen/.test(m) && /step2/.test(m)), out.join("\n"));
});

test("evidence: a record with no screen list fails for a tool in screens.json", () => {
  const review = { ...goodReview, otherScreens: [screen("empty"), screen("step2")] };
  const out = checkTool(repo(files({ ...listed, "tests/model-review/t.json": review })), { id: "t" });
  assert.ok(out.some((m) => /does not cover every screen/.test(m)), out.join("\n"));
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

const entry = (checks, extra = {}) => ({ tool: "t", checks, minScore: 3, by: "owner", date: "2026-11-05", expires: "2999-01-01", said: "Ship it all", ...extra });
const waiver = (checks, extra = {}) => ({ waivers: [entry(checks, extra)] });

test("evidence: an owner waiver excuses only the named check for the named tool", () => {
  const review = { ...goodReview, firstTimeUser: { score: 3 } };
  const root = repo(files({ "tests/model-review/t.json": review, "tests/model-review/waivers.json": waiver(["first-time-user"]) }));
  const r = checkToolDetailed(root, { id: "t" });
  assert.deepEqual(r.failures, []);
  assert.ok(r.waived.some((m) => /first-time-user score \(main\) is 3/.test(m)));
  assert.ok(checkTool(root, { id: "other" }).some((m) => /no model review record/.test(m)));
});

test("evidence: a rubric rule cannot be waived, so a failed rule8 still fails", () => {
  const rules = [...pass8.slice(0, 7), "FAIL"];
  const review = { ...goodReview, designRubric: [{ model: "haiku", rules }, goodReview.designRubric[1]] };
  const root = repo(files({ "tests/model-review/t.json": review, "tests/model-review/waivers.json": waiver(["rule8"]) }));
  assert.ok(checkTool(root, { id: "t" }).some((m) => /not 8 of 8: rule8\./.test(m)));
  assert.match(waiverProblem(entry(["rule8"]), "2026-11-05"), /cannot waive rule8/);
});

test("evidence: a waiver without who, when and their words does nothing", () => {
  const review = { ...goodReview, firstTimeUser: { score: 3 } };
  const root = repo(files({ "tests/model-review/t.json": review, "tests/model-review/waivers.json": { waivers: [{ tool: "t", checks: ["first-time-user"] }] } }));
  assert.ok(checkTool(root, { id: "t" }).some((m) => /needs 4 or more/.test(m)));
});

test("evidence: a waiver never excuses a missing score or a skill eval", () => {
  const review = { ...goodReview, firstTimeUser: {} };
  const root = repo(files({ "tests/model-review/t.json": review, "tests/skill-evals/results/t/tiny.json": { verdict: { ok: false } }, "tests/model-review/waivers.json": waiver(["first-time-user", "rule8"]) }));
  const out = checkTool(root, { id: "t" });
  assert.ok(out.some((m) => /is missing/.test(m)));
  assert.ok(out.some((m) => /tiny is below the bar/.test(m)));
});

test("evidence: a waiver may name only first-time-user, and a bad entry is reported for any tool", () => {
  assert.match(waiverProblem(entry(["rule2"]), "2026-11-05"), /cannot waive rule2/);
  const root = repo({ "tests/model-review/waivers.json": { waivers: [entry(["rule2"]), { checks: ["first-time-user"] }] } });
  const probs = waiverFileProblems(root, "2026-11-05");
  assert.equal(probs.length, 2);
  assert.ok(probs.some((m) => /cannot waive rule2/.test(m)));
  assert.ok(probs.some((m) => /missing tool/.test(m)));
});

test("evidence: a reader score below the waiver floor still fails", () => {
  const review = { ...goodReview, firstTimeUser: { score: 2 } };
  const root = repo(files({ "tests/model-review/t.json": review, "tests/model-review/waivers.json": waiver(["first-time-user"]) }));
  assert.ok(checkTool(root, { id: "t" }).some((m) => /\(main\) is 2, needs 4/.test(m)));
});

test("evidence: a waiver limited to some screens does not excuse another screen", () => {
  const review = { ...goodReview, otherScreens: [{ screen: "empty", firstTimeUser: { score: 3 }, designRubric: goodReview.designRubric }] };
  const root = repo(files({ "tests/model-review/t.json": review, "tests/model-review/waivers.json": waiver(["first-time-user"], { screens: ["main"] }) }));
  assert.ok(checkTool(root, { id: "t" }).some((m) => /\(empty\) is 3/.test(m)));
});

test("evidence: an expired waiver, or one with a bad date, fails the gate", () => {
  assert.match(waiverProblem(entry(["first-time-user"], { expires: "2020-01-01", date: "2019-01-01" }), "2026-11-05"), /expired/);
  assert.match(waiverProblem(entry(["first-time-user"], { date: "today" }), "2026-11-05"), /date must be/);
  assert.match(waiverProblem(entry(["first-time-user"], { minScore: 0 }), "2026-11-05"), /minScore/);
  assert.match(waiverProblem(entry(["first-time-user"], { expires: "2027-99-99" }), "2026-11-05"), /expires must be a real day/);
  assert.match(waiverProblem(entry(["first-time-user"], { expires: "2026-11-01" }), "2026-10-01"), /after date/);
});
