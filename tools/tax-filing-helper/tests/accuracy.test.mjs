import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAnswers, PRACTICE_SHEET, screensOf } from "../calc.mjs";
import { parseMoney } from "../../_shared/money.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const run = (c) => {
  const r = checkAnswers(PRACTICE_SHEET, c.typed);
  assert.equal(r.ok, true, c.id);
  return r;
};
const statuses = (r) => Object.fromEntries(r.rows.map((x) => [x.id, x.status]));

test("money-compared-in-cents: money text parses to the golden cents", () => {
  for (const m of golden.money) assert.equal(parseMoney(m.text), m.cents, m.text);
  const c = golden.cases.find((x) => x.id === "cents-differ");
  assert.equal(statuses(run(c)).interest, "different");
  assert.equal(run(c).rows.find((x) => x.id === "interest").message, c.expect.messages.interest);
});

test("text-ignores-spacing-and-case: spaces, capitals and dollar signs still match", () => {
  const c = golden.cases.find((x) => x.id === "spacing-case-and-dollar-signs");
  assert.deepEqual(statuses(run(c)), c.expect.statuses);
});

test("mismatch-in-plain-words: every golden case gives the golden statuses, counts and messages", () => {
  for (const c of golden.cases) {
    const r = run(c);
    assert.deepEqual(statuses(r), c.expect.statuses, c.id);
    for (const k of ["total", "matched", "different", "missing", "allMatch", "summary"]) assert.equal(r[k], c.expect[k], `${c.id} ${k}`);
    for (const [id, msg] of Object.entries(c.expect.messages ?? {})) assert.equal(r.rows.find((x) => x.id === id).message, msg, `${c.id} ${id}`);
  }
});

test("missing-answer-named: nothing typed names every answer and shows the sheet value", () => {
  const r = run(golden.cases.find((x) => x.id === "nothing-typed"));
  assert.equal(r.missing, 8);
  assert.ok(r.rows.every((x) => x.message.includes("nothing typed yet") && x.message.includes("The sheet says")));
});

test("all-match-reported: only a full match says all answers match", () => {
  for (const c of golden.cases) assert.equal(run(c).summary.startsWith("All "), c.expect.allMatch, c.id);
});

test("practice-data-is-made-up: no SSN shape, no bank number, only example.com emails", () => {
  const all = JSON.stringify(PRACTICE_SHEET);
  assert.doesNotMatch(all, /\b\d{3}-\d{2}-\d{4}\b/);
  assert.doesNotMatch(all, /\b\d{9}\b/);
  for (const m of all.match(/[\w.+-]+@[\w.-]+/g) ?? []) assert.match(m, /@example\.com$/);
  assert.equal(screensOf().length, 3);
});

test("stops-at-review-page: the page source has no submit button and no submitting form", () => {
  const dir = path.resolve(here, "../../../site/src/tools/tax-filing-helper");
  const page = fs.readFileSync(path.join(dir, "Page.tsx"), "utf8");
  assert.doesNotMatch(page, /type=["']submit["']/);
  assert.doesNotMatch(page, /<input[^>]*type=["']submit["']/);
  const copy = fs.readFileSync(path.join(dir, "copy.ts"), "utf8");
  assert.ok(copy.includes("This is where you stop. You press Submit yourself, on the real IRS partner site."));
});

test("messy-input-never-nan: golden bad sheets give plain-words problems", () => {
  for (const e of golden.errors) {
    const r = checkAnswers(e.sheet, e.typed);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10);
  }
});
