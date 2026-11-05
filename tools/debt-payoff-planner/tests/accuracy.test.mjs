import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { monthInterest, planDebtPayoff } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.plans.find((c) => c.id === id);
const run = (id) => {
  const r = planDebtPayoff(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};
const answer = (r) => {
  const { ok, ...rest } = r;
  return rest;
};

test("monthly-interest-exact: balance times rate over 12, half up to the cent", () => {
  assert.equal(monthInterest(1200, 50), 1); // 0.5 cent rounds up
  assert.equal(monthInterest(1199, 50), 0); // 0.49958 cent rounds down
  assert.equal(monthInterest(50000, 1800), 750); // $500 at 18% = $7.50
  assert.equal(monthInterest(1000000, 0), 0);
  assert.equal(run("half-cent-rounds-up").snowball.totalInterestCents, 1);
});

test("months-to-debt-free-exact: every golden case matches the independent month count", () => {
  for (const c of golden.plans) {
    const r = run(c.id);
    assert.equal(r.snowball.months, c.expect.snowball.months, c.id);
    assert.equal(r.avalanche.months, c.expect.avalanche.months, c.id);
  }
  assert.equal(run("zero-rate-hand").snowball.months, 10);
  assert.equal(run("rolling-by-hand").avalanche.months, 8);
});

test("total-interest-exact: interest and total paid match, and paid minus borrowed equals interest", () => {
  for (const c of golden.plans) {
    const r = run(c.id);
    for (const plan of ["snowball", "avalanche"]) {
      assert.equal(r[plan].totalInterestCents, c.expect[plan].totalInterestCents, `${c.id} ${plan}`);
      assert.equal(r[plan].totalPaidCents, c.expect[plan].totalPaidCents, `${c.id} ${plan}`);
      assert.equal(r[plan].totalPaidCents - r.totalBalanceCents, r[plan].totalInterestCents, `${c.id} ${plan}`);
    }
  }
});

test("payoff-order-exact: each debt with the month it reaches zero", () => {
  for (const c of golden.plans) {
    const r = run(c.id);
    assert.deepEqual(r.snowball.order, c.expect.snowball.order, c.id);
    assert.deepEqual(r.avalanche.order, c.expect.avalanche.order, c.id);
    assert.equal(r.snowball.order.at(-1).month, r.snowball.months, c.id);
  }
});

test("rolled-minimums-exact: a cleared debt's smallest payment goes to the next debt", () => {
  const r = run("rolling-by-hand");
  assert.deepEqual(r.snowball.order, [{ name: "Small", month: 2 }, { name: "Big", month: 8 }]);
  assert.equal(r.snowball.months, 8); // without rolling, Big alone at $100 a month would take 10
  assert.equal(r.monthlyMoneyCents, 15000);
});

test("plans-difference-exact: months and interest apart match, and every case is whole", () => {
  for (const c of golden.plans) assert.deepEqual(answer(run(c.id)), c.expect, c.id);
  const d = run("plans-differ-a-lot").difference;
  assert.equal(d.lessInterest, "avalanche");
  assert.equal(d.interestApartCents, 616219 - 580094);
  assert.equal(run("single-debt").difference.lessInterest, "same");
});

test("payment-too-small-says-so: the smallest payment does not cover the interest", () => {
  for (const id of ["minimum-equals-interest", "minimum-below-interest"]) {
    const e = golden.errors.find((x) => x.id === id);
    const r = planDebtPayoff(e.input);
    assert.equal(r.ok, false, id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, id);
    assert.match(r.problems[0].message, /does not cover the first month's interest/);
  }
});

test("stops-at-1200-months: a plan that would pass 1,200 months stops with a plain message", () => {
  const e = golden.errors.find((x) => x.id === "passes-1200-months");
  const r = planDebtPayoff(e.input);
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors);
  assert.match(r.problems[0].message, /more than 1,200 months/);
  assert.equal(run("long-but-under-cap").snowball.months, 695);
});

test("messy-input-never-nan: typed with spaces, commas, dollar and percent signs gives the same numbers", () => {
  const messy = run("messy-typing");
  const clean = run("classic-four");
  assert.deepEqual(messy.snowball.totalInterestCents, clean.snowball.totalInterestCents);
  assert.deepEqual(messy.avalanche.months, clean.avalanche.months);
  assert.deepEqual(messy.debts.map((d) => d.name), ["Debt 1", "Debt 3", "Debt 4", "Debt 5"]);
});

test("plain-error-words: golden bad entries name the debt, the field and the kind", () => {
  for (const e of golden.errors) {
    const r = planDebtPayoff(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !/NaN|undefined|null|Infinity/.test(p.message), e.id);
  }
});
