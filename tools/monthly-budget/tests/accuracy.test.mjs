import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatMoney, planBudget } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.budgets.find((c) => c.id === id);
const run = (id) => {
  const r = planBudget(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

test("total-income-exact: every golden budget matches the independent income total", () => {
  for (const c of golden.budgets) assert.equal(run(c.id).incomeCents, c.expect.incomeCents, c.id);
  assert.equal(run("plain").incomeCents, 300000);
  assert.deepEqual(run("cents").incomeRows, byId("cents").expect.incomeRows);
});

test("total-spending-exact: every golden budget matches the independent spending total", () => {
  for (const c of golden.budgets) assert.equal(run(c.id).spendingCents, c.expect.spendingCents, c.id);
  assert.equal(run("plain").spendingCents, 230000);
});

test("left-over-exact: income minus spending, negative shown plainly", () => {
  for (const c of golden.budgets) {
    const r = run(c.id);
    assert.equal(r.leftCents, c.expect.leftCents, c.id);
    assert.equal(r.overspent, c.expect.overspent, c.id);
  }
  assert.equal(formatMoney(run("plain").leftCents), "$700.00");
  assert.equal(formatMoney(run("overspent").leftCents), "-$249.75");
  assert.equal(run("exact-income").leftCents, 0);
  assert.equal(run("exact-income").overspent, false);
});

test("percent-of-income-exact: whole numbers match golden and add up to the percent spent", () => {
  for (const c of golden.budgets) {
    const r = run(c.id);
    assert.equal(r.spendingPercentOfIncome, c.expect.spendingPercentOfIncome, c.id);
    assert.deepEqual(r.expenseRows.map((x) => x.percentOfIncome), c.expect.expenseRows.map((x) => x.percentOfIncome), c.id);
    if (r.incomeCents > 0) assert.equal(sum(r.expenseRows.map((x) => x.percentOfIncome)), r.spendingPercentOfIncome, c.id);
  }
  assert.deepEqual(run("plain").expenseRows.map((x) => x.percentOfIncome), [40, 15, 10, 9, 3]);
  assert.equal(run("overspent").spendingPercentOfIncome, 120);
});

test("share-of-spending-sums-100: largest remainder gives whole numbers that add to exactly 100", () => {
  for (const c of golden.budgets) {
    const r = run(c.id);
    assert.deepEqual(r.expenseRows.map((x) => x.shareOfSpending), c.expect.expenseRows.map((x) => x.shareOfSpending), c.id);
    if (r.spendingCents > 0) assert.equal(sum(r.expenseRows.map((x) => x.shareOfSpending)), 100, c.id);
  }
  assert.deepEqual(run("thirds").expenseRows.map((x) => x.shareOfSpending), [34, 33, 33]);
});

test("no-income-no-divide: totals show, percents of income are null", () => {
  const r = run("no-income");
  assert.equal(r.incomeCents, 0);
  assert.equal(r.spendingPercentOfIncome, null);
  assert.ok(r.expenseRows.every((x) => x.percentOfIncome === null));
  assert.equal(r.leftCents, -100100);
  const blank = run("blank");
  assert.equal(blank.hasAmounts, false);
  assert.equal(run("no-spending").expenseRows[0].shareOfSpending, null);
});

test("messy-input-never-nan: bad typing gives a plain answer, never NaN, Infinity or a crash", () => {
  const messy = ["", "lots", "NaN", "Infinity", "-Infinity", "1e999", "1e15", "$$5", "1.2.3", "\u{1F600}", "  ", null, undefined, {}, [], NaN, Infinity];
  const clean = (v, where) => {
    if (typeof v === "number") assert.ok(Number.isFinite(v) && Number.isSafeInteger(v), `${where}: ${v}`);
    else if (Array.isArray(v)) v.forEach((x, i) => clean(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) clean(x, `${where}.${k}`);
  };
  for (const list of ["income", "expenses"]) {
    for (const text of messy) {
      const input = { income: [{ name: "Pay", amount: "3000" }], expenses: [{ name: "Rent", amount: "1200" }] };
      input[list][0].amount = text;
      let r;
      assert.doesNotThrow(() => { r = planBudget(input); }, `${list}=${String(text)}`);
      clean(r, `${list}=${String(text)}`);
    }
  }
  for (const input of [undefined, null, "x", 5, [], {}]) {
    let r;
    assert.doesNotThrow(() => { r = planBudget(input); });
    assert.equal(r.ok, false);
  }
});

test("plain-error-words: a bad entry gets a calm message that names the line", () => {
  const r = planBudget({
    income: [{ name: "Pay", amount: "lots" }],
    expenses: [{ name: "Rent", amount: "-5" }, { name: "Food", amount: "2000000000" }, { name: "", amount: "1.2.3" }],
  });
  assert.equal(r.ok, false);
  const msgs = r.problems.map((p) => p.message);
  assert.equal(msgs.length, 4);
  assert.ok(msgs[0].startsWith("Pay:"), msgs[0]);
  assert.ok(msgs[1].startsWith("Rent:"), msgs[1]);
  assert.ok(msgs[2].startsWith("Food:"), msgs[2]);
  assert.ok(msgs[3].startsWith("Spending line 3:"), msgs[3]);
  for (const m of msgs) {
    assert.ok(!/NaN|undefined|null|Infinity|\[object|Error|exception/i.test(m), m);
    assert.ok(/[.]$/.test(m), m);
  }
});
