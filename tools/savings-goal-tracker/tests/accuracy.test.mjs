import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explainSavings, parseMonth } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const claims = JSON.parse(fs.readFileSync(path.join(here, "..", "claims.json"), "utf8")).claims;
const when = (id) => golden.when.find((c) => c.id === id);
const by = (id) => golden.by.find((c) => c.id === id);
const run = (c) => {
  const r = explainSavings(c.input);
  assert.equal(r.ok, true, c.id);
  return r;
};

test("every claim in claims.json is named by a test title", () => {
  const titles = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  for (const c of claims) assert.ok(titles.includes(`test("${c.id}`) || titles.includes(`"${c.id}:`), c.id);
});

test("months-to-goal-exact: every golden case matches the independent month count", () => {
  for (const c of golden.when) {
    const r = run(c);
    assert.equal(r.months, c.expect.months, c.id);
    assert.equal(r.status, c.expect.status, c.id);
    assert.equal(r.finalBalanceCents, c.expect.finalBalanceCents, c.id);
  }
  assert.equal(run(when("plain-18")).months, 18);
  assert.equal(run(when("interest-45")).months, 29);
});

test("landing-month-exact: the landing month is the start month plus months minus one", () => {
  assert.equal(run(when("plain-18")).landing, "2028-05");
  assert.equal(run(when("year-boundary")).landing, "2027-06");
  assert.equal(run(when("cap-1200-ok")).landing, "2099-12");
  assert.equal(run(when("one-month")).landing, "2026-12");
  assert.equal(run(when("no-start")).landing, null);
  for (const c of golden.when) assert.equal(run(c).landing, c.expect.landing, c.id);
  assert.deepEqual(parseMonth("2026-12"), { year: 2026, month: 12 });
});

test("monthly-needed-exact: the smallest whole-cent amount that reaches the goal", () => {
  for (const c of golden.by) {
    const r = run(c);
    assert.deepEqual(Object.fromEntries(Object.entries(r).filter(([k]) => k !== "ok")), c.expect, c.id);
  }
  assert.equal(run(by("by-12-plain")).monthlyNeededCents, 75000);
  assert.equal(run(by("by-uneven")).monthlyNeededCents, 14286);
  // One cent less would miss the goal: check by the "when" path with that amount.
  const c = by("by-24-interest");
  const need = run(c).monthlyNeededCents;
  const fits = (m) => explainSavings({ mode: "when", goal: c.input.goal, saved: c.input.saved, rate: c.input.rate, start: c.input.start, monthly: (m / 100).toFixed(2) });
  assert.ok(fits(need).months <= 24);
  assert.ok(fits(need - 1).months === null || fits(need - 1).months > 24);
});

test("interest-half-up-exact: half a cent rounds up each month", () => {
  const r = run(when("half-up-edge"));
  assert.equal(r.months, 3);
  assert.equal(r.finalBalanceCents, 60006);
  assert.equal(r.interestEarnedCents, 3);
  const z = run(when("zero-monthly-interest"));
  assert.equal(z.months, 10);
  assert.equal(z.finalBalanceCents, 110463);
});

test("already-reached-and-zero-savings: plain true answers", () => {
  const a = run(when("already"));
  assert.equal(a.status, "reached");
  assert.equal(a.months, 0);
  assert.equal(run(when("exact-equal")).status, "reached");
  const z = run(when("zero-monthly"));
  assert.equal(z.status, "no-savings");
  assert.equal(z.months, null);
  assert.equal(run(by("by-already")).monthlyNeededCents, 0);
});

test("cap-1200-months: 1,200 works and 1,201 says it takes too long", () => {
  assert.equal(run(when("cap-1200-ok")).status, "will-reach");
  assert.equal(run(when("cap-1200-ok")).months, 1200);
  const t = run(when("cap-1201-too-long"));
  assert.equal(t.status, "too-long");
  assert.equal(t.months, null);
  assert.equal(t.landing, null);
});

test("year-table-adds-up: deposits plus interest plus saved equals the balance", () => {
  for (const c of golden.when) {
    const r = run(c);
    if (r.byYear.length === 0) continue;
    const dep = r.byYear.reduce((a, y) => a + y.depositsCents, 0);
    const int = r.byYear.reduce((a, y) => a + y.interestCents, 0);
    assert.equal(dep, r.depositsCents, c.id);
    assert.equal(int, r.interestEarnedCents, c.id);
    assert.equal(r.savedCents + dep + int, r.finalBalanceCents, c.id);
    assert.equal(r.byYear[r.byYear.length - 1].balanceCents, r.finalBalanceCents, c.id);
    assert.deepEqual(r.byYear, c.expect.byYear, c.id);
  }
});

test("plain-error-words: bad entries name the field", () => {
  for (const e of golden.errors) {
    const r = explainSavings(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10);
  }
  const r = explainSavings({ goal: "lots", monthly: "5" });
  assert.match(r.problems[0].message, /^Goal amount:/);
});

test("messy-input-never-nan: accuracy side, text parses exactly", () => {
  const r = explainSavings({ goal: " $5,000.00 ", saved: "1,000", monthly: " 250 ", rate: "0%", start: " 2026-12 " });
  assert.equal(r.ok, true);
  assert.equal(r.months, 16);
  assert.equal(r.landing, "2028-03");
});
