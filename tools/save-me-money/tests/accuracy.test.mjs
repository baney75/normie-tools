import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatMoney, listCosts, QUESTIONS } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.plans.find((c) => c.id === id);
const run = (id) => {
  const r = listCosts(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};

test("yearly-exact: every golden plan matches the independent yearly costs", () => {
  for (const c of golden.plans) {
    const r = run(c.id);
    assert.deepEqual(r.rows.map((x) => x.yearlyCents), c.expect.rows.map((x) => x.yearlyCents), c.id);
  }
  const gym = run("plain").rows.find((x) => x.name === "Gym");
  assert.equal(gym.yearlyCents, 52000, "weekly uses 52 weeks");
  assert.equal(run("large").rows[0].yearlyCents, 5_200_000_000_000);
});

test("monthly-half-up: monthly figure is yearly over 12 rounded half up", () => {
  for (const c of golden.plans) {
    const r = run(c.id);
    assert.deepEqual(r.rows.map((x) => x.monthlyCents), c.expect.rows.map((x) => x.monthlyCents), c.id);
  }
  assert.deepEqual(run("yearly-half-up").rows.map((x) => [x.name, x.monthlyCents]), [["C", 13], ["B", 1], ["A", 1], ["D", 0]]);
  assert.equal(run("plain").rows.find((x) => x.name === "Gym").monthlyCents, 4333);
});

test("totals-are-sums: totals match golden and equal the sum of the lines", () => {
  for (const c of golden.plans) {
    const r = run(c.id);
    assert.equal(r.yearlyCents, c.expect.yearlyCents, c.id);
    assert.equal(r.monthlyCents, c.expect.monthlyCents, c.id);
    assert.equal(r.yearlyCents, r.rows.reduce((a, x) => a + x.yearlyCents, 0), c.id);
    assert.equal(r.count, c.expect.count, c.id);
  }
  assert.equal(formatMoney(run("plain").yearlyCents), "$3,951.88");
  assert.equal(formatMoney(run("plain").monthlyCents), "$329.32");
  assert.equal(run("sum-of-lines").monthlyCents, 24);
});

test("biggest-first: sorted by yearly cost, ties keep typed order", () => {
  for (const c of golden.plans) assert.deepEqual(listCosts(c.input).rows.map((x) => x.index), c.expect.rows.map((x) => x.index), c.id);
  assert.deepEqual(run("ties-keep-order").rows.map((x) => x.name), ["Big", "First", "Second", "Third"]);
  assert.equal(run("plain").rows[0].name, "Insurance");
});

test("blank-left-out: blank and zero lines are not listed and nothing is invented", () => {
  const r = run("blank-and-zero");
  assert.deepEqual(r.rows.map((x) => x.name), ["Water"]);
  const none = run("nothing-typed");
  assert.equal(none.hasAmounts, false);
  assert.equal(none.rows.length, 0);
  assert.equal(none.yearlyCents, 0);
  assert.equal(none.monthlyCents, 0);
});

test("questions-invent-nothing: the questions are generic, with no digits, dollar signs or advice", () => {
  assert.ok(QUESTIONS.length >= 4);
  for (const q of QUESTIONS) {
    assert.match(q, /\?$/);
    assert.doesNotMatch(q, /[0-9$%]/);
    assert.doesNotMatch(q, /\byou should\b|\bswitch to\b|\bcancel it\b|\bsave\b/i);
  }
});

test("messy-input-never-nan: typed oddities name themselves in golden", () => {
  const r = run("messy-typing");
  assert.deepEqual(r.rows.map((x) => x.name), ["Cost 2", "Car cover"]);
  assert.equal(r.rows[1].every, "year");
  assert.equal(r.rows[0].every, "week");
});

test("plain-error-words: golden errors name the right lines and read calmly", () => {
  for (const e of golden.errors) {
    const r = listCosts(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) {
      assert.ok(/[.]$/.test(p.message), p.message);
      assert.ok(!/NaN|undefined|null|Infinity|\[object|Error|exception/i.test(p.message), p.message);
    }
  }
  const r = listCosts({ items: [{ name: "Gym", amount: "x", every: "week" }, { name: "", amount: "-1", every: "week" }] });
  assert.ok(r.problems[0].message.startsWith("Gym:"));
  assert.ok(r.problems[1].message.startsWith("Cost 2:"));
});
