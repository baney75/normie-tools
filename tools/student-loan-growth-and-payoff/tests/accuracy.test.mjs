import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explainStudentLoan, addMonths } from "../calc.mjs";
import { parseMoney, parseRate } from "../../_shared/money.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.loans.find((c) => c.id === id);
const run = (id) => {
  const r = explainStudentLoan(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};

test("money and rate text read exactly like the independent answers", () => {
  for (const c of golden.money) assert.equal(parseMoney(c.text), c.cents, c.text);
  for (const c of golden.rate) assert.equal(parseRate(c.text), c.bps, c.text);
});

test("waiting-interest-exact: one rounded month times the months waited", () => {
  for (const c of golden.loans) {
    const r = run(c.id);
    assert.equal(r.monthlyInterestCents, c.expect.monthlyInterestCents, c.id);
    assert.equal(r.unpaidInterestCents, c.expect.unpaidInterestCents, c.id);
  }
  assert.equal(run("grad-no-cap").monthlyInterestCents, 8333);
  assert.equal(run("grad-no-cap").unpaidInterestCents, 49998);
  assert.equal(run("tiny-loan").monthlyInterestCents, 0);
});

test("balance-at-start-exact: balance plus unpaid interest", () => {
  for (const c of golden.loans) assert.equal(run(c.id).balanceAtStartCents, c.expect.balanceAtStartCents, c.id);
  assert.equal(run("balance-only").balanceAtStartCents, 522500);
  assert.equal(run("balance-only").payoff, null);
});

test("toggle-adds-interest: on costs more interest than off for the same loan", () => {
  const off = run("grad-no-cap");
  const on = run("grad-cap");
  assert.equal(off.balanceAtStartCents, on.balanceAtStartCents);
  assert.equal(off.payoff.totalInterestCents, 417144);
  assert.equal(on.payoff.totalInterestCents, 417647);
  assert.ok(on.payoff.totalInterestCents > off.payoff.totalInterestCents);
  assert.ok(on.minPayment.paymentCents > off.minPayment.paymentCents);
});

test("months-to-payoff-exact: months, total paid and total interest match", () => {
  for (const c of golden.loans) {
    const r = run(c.id);
    if (!c.expect.payoff) continue;
    assert.equal(r.payoff.months, c.expect.payoff.months, c.id);
    assert.equal(r.payoff.totalPaidCents, c.expect.payoff.totalPaidCents, c.id);
    assert.equal(r.payoff.totalInterestCents, c.expect.payoff.totalInterestCents, c.id);
    assert.equal(r.payoff.totalPaidCents - r.principalCents, r.payoff.totalInterestCents, c.id);
  }
});

test("payoff-date-exact: start month plus months to pay off", () => {
  for (const c of golden.loans) {
    if (c.expect.payoff) assert.deepEqual(run(c.id).payoff.payoffDate, c.expect.payoff.payoffDate, c.id);
  }
  assert.equal(run("one-payment").payoff.payoffDate.label, "December 2026");
  assert.equal(run("zero-rate").payoff.payoffDate.label, "December 2030");
  assert.equal(run("no-start-date").payoff.payoffDate, null);
  assert.deepEqual(addMonths({ year: 2026, month: 12 }, 1), { year: 2027, month: 1, label: "January 2027" });
});

test("minimum-payment-exact: smallest payment that pays off in the chosen years", () => {
  for (const c of golden.loans) {
    const r = run(c.id);
    if (!c.expect.minPayment) {
      assert.equal(r.minPayment, null, c.id);
      continue;
    }
    const { paymentCents, months, years } = c.expect.minPayment;
    assert.deepEqual({ ...r.minPayment }, { years, months, paymentCents }, c.id);
    if (c.expect.minPayment.exactFormulaCents) assert.ok(Math.abs(paymentCents - c.expect.minPayment.exactFormulaCents) < 2, c.id);
  }
  // Using the found payment really pays off in time, and one cent less does not.
  for (const id of ["grad-cap", "zero-rate", "long-wait-cap"]) {
    const c = byId(id);
    const need = run(id).minPayment;
    const fit = explainStudentLoan({ ...c.input, payment: (need.paymentCents / 100).toFixed(2) });
    assert.ok(fit.payoff.months <= need.months, id);
    const less = explainStudentLoan({ ...c.input, payment: ((need.paymentCents - 1) / 100).toFixed(2) });
    assert.ok(!less.ok || less.payoff.months > need.months, id);
  }
});

test("by-year-table-adds-up: sections match golden, sum to totals, balance ends at zero", () => {
  for (const c of golden.loans) {
    const r = run(c.id);
    if (!c.expect.payoff) continue;
    assert.deepEqual(r.payoff.byYear, c.expect.payoff.byYear, c.id);
    const y = r.payoff.byYear;
    assert.equal(y.reduce((a, row) => a + row.paidCents, 0), r.payoff.totalPaidCents, c.id);
    // Money that paid down the loan: the whole start balance when the toggle is on, else the first balance.
    // Interest paid in the table is the rest of the total paid.
    const down = r.capitalize ? r.balanceAtStartCents : r.principalCents;
    assert.equal(y.reduce((a, row) => a + row.principalCents, 0), down, c.id);
    assert.equal(y.reduce((a, row) => a + row.interestCents, 0), r.payoff.totalPaidCents - down, c.id);
    assert.equal(y.at(-1).balanceCents, 0, c.id);
  }
});

test("zero-rate-and-edges: rate 0, one payment and 100 years", () => {
  const z = run("zero-rate");
  assert.equal(z.payoff.months, 48);
  assert.equal(z.payoff.totalInterestCents, 0);
  assert.equal(z.minPayment.paymentCents, 25000);
  assert.equal(run("one-payment").payoff.months, 1);
  assert.equal(run("min-100-years").minPayment.paymentCents, 5013);
});

test("plain-error-words: each golden bad entry names its field", () => {
  for (const e of golden.errors) {
    const r = explainStudentLoan(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10, e.id);
  }
});

test("messy-input-never-nan: bad typing gives a plain answer, never NaN, Infinity or a crash", () => {
  const base = { balance: "20000", rate: "5", waitMonths: "6", capitalize: false, payment: "300", start: "2026-09", years: "10" };
  const messy = ["", "lots", "NaN", "Infinity", "-Infinity", "1e999", "1e15", "$$5", "1.2.3", "\u{1F600}", "  ", "0000-00", null, undefined];
  const clean = (v, where) => {
    if (typeof v === "number") assert.ok(Number.isFinite(v) && Number.isSafeInteger(v), `${where}: ${v}`);
    else if (Array.isArray(v)) v.forEach((x, i) => clean(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) clean(x, `${where}.${k}`);
  };
  for (const field of ["balance", "rate", "waitMonths", "payment", "start", "years"]) {
    for (const text of messy) {
      let r;
      assert.doesNotThrow(() => { r = explainStudentLoan({ ...base, [field]: text }); }, `${field}=${String(text)}`);
      clean(r, `${field}=${String(text)}`);
    }
  }
  for (const input of [undefined, null, "x", 5, []]) {
    let r;
    assert.doesNotThrow(() => { r = explainStudentLoan(input); });
    assert.equal(r.ok, false);
  }
});
