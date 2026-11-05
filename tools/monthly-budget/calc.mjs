// Monthly Budget math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/monthly-budget/scripts/calc.py.
//
// Money is integer cents. Amounts are typed per month. Nothing is rounded except percents.
// Totals are plain sums of cents. Left over = total income minus total spending (may be negative).
//
// Percents are whole numbers and use the LARGEST REMAINDER method so they add up exactly:
//   1. Each row gets floor(100 * row / whole).
//   2. The points still missing are given, one each, to the rows with the biggest leftover
//      fraction. A tie goes to the row higher in the list.
// Two sets of percents:
//   percentOfIncome: whole = total income. They add up to round-half-up(100 * spending / income),
//     which is the percent of income that is spent.
//   shareOfSpending: whole = total spending. They add up to exactly 100.
// This is a count of typed numbers. It is not advice.
import { divRoundHalfUp, parseMoney } from "../_shared/money.mjs";

export { formatMoney } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000 per line
export const MAX_ROWS = 40; // lines in each list
export const MAX_NAME = 60; // letters kept from a name

/**
 * @typedef {{ name: string, amount: string }} BudgetLine
 * @typedef {{ income: BudgetLine[], expenses: BudgetLine[] }} BudgetInput
 * @typedef {{ field: string, kind: "missing"|"bad", message: string }} BudgetProblem
 * @typedef {{ name: string, cents: number }} IncomeRow
 * @typedef {{ name: string, cents: number, percentOfIncome: number|null, shareOfSpending: number|null }} ExpenseRow
 * @typedef {{ ok: true, hasAmounts: boolean, incomeCents: number, spendingCents: number, leftCents: number,
 *   overspent: boolean, spendingPercentOfIncome: number|null, incomeRows: IncomeRow[], expenseRows: ExpenseRow[] }} BudgetResult
 */

export const MESSAGES = {
  incomeMissing: "The income list is missing.",
  expensesMissing: "The spending list is missing.",
  tooMany: "Too many lines. Use 40 or fewer in each list.",
  bad: (label) => `${label}: use a dollar amount like 1,200, or leave it empty.`,
  negative: (label) => `${label}: use zero or more. A minus sign does not work here.`,
  big: (label) => `${label}: that is too big for this tool. Use $1,000,000,000 or less.`,
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/** Largest remainder split. Returns whole numbers that add up to `target`. */
function splitWhole(values, whole, target) {
  const w = BigInt(whole);
  const t = BigInt(target);
  const floors = values.map((v) => (BigInt(v) * 100n) / w);
  const rems = values.map((v) => (BigInt(v) * 100n) % w);
  let missing = t - floors.reduce((a, b) => a + b, 0n);
  const order = values.map((_, i) => i).sort((a, b) => (rems[a] === rems[b] ? a - b : rems[a] > rems[b] ? -1 : 1));
  const out = floors.slice();
  for (const i of order) {
    if (missing <= 0n) break;
    out[i] += 1n;
    missing -= 1n;
  }
  return out.map(Number);
}

/**
 * Read one list. Returns rows or problems.
 * @param {unknown} list
 * @param {"income"|"expenses"} key
 * @param {string} fallback "Income line" or "Spending line"
 */
function readList(list, key, fallback, problems) {
  if (!Array.isArray(list)) {
    problems.push({ field: key, kind: "missing", message: key === "income" ? MESSAGES.incomeMissing : MESSAGES.expensesMissing });
    return [];
  }
  if (list.length > MAX_ROWS) {
    problems.push({ field: key, kind: "bad", message: MESSAGES.tooMany });
    return [];
  }
  const rows = [];
  list.forEach((line, i) => {
    const src = line && typeof line === "object" ? line : {};
    const rawName = typeof src.name === "string" ? src.name.trim() : "";
    const name = Array.from(rawName).slice(0, MAX_NAME).join("");
    const label = name || `${fallback} ${i + 1}`;
    let cents = 0;
    if (!isBlank(src.amount)) {
      const v = parseMoney(src.amount);
      if (v === null) problems.push({ field: `${key}.${i}`, kind: "bad", message: MESSAGES.bad(label) });
      else if (v < 0) problems.push({ field: `${key}.${i}`, kind: "bad", message: MESSAGES.negative(label) });
      else if (v > MAX_AMOUNT_CENTS) problems.push({ field: `${key}.${i}`, kind: "bad", message: MESSAGES.big(label) });
      else cents = v;
    }
    rows.push({ name: label, cents });
  });
  return rows;
}

/**
 * Typed lines in, totals and percents or plain-words problems out. Never throws, never gives NaN.
 * @param {Partial<BudgetInput>} input
 * @returns {BudgetResult | { ok: false, problems: BudgetProblem[] }}
 */
export function planBudget(input) {
  const src = input && typeof input === "object" ? input : {};
  /** @type {BudgetProblem[]} */
  const problems = [];
  const incomeRows = readList(src.income, "income", "Income line", problems);
  const spendRows = readList(src.expenses, "expenses", "Spending line", problems);
  if (problems.length > 0) return { ok: false, problems };

  const incomeCents = incomeRows.reduce((a, r) => a + r.cents, 0);
  const spendingCents = spendRows.reduce((a, r) => a + r.cents, 0);
  const cents = spendRows.map((r) => r.cents);
  const ofIncome = incomeCents > 0
    ? splitWhole(cents, incomeCents, divRoundHalfUp(BigInt(spendingCents) * 100n, BigInt(incomeCents)))
    : null;
  const shares = spendingCents > 0 ? splitWhole(cents, spendingCents, 100) : null;

  return {
    ok: true,
    hasAmounts: incomeCents > 0 || spendingCents > 0,
    incomeCents,
    spendingCents,
    leftCents: incomeCents - spendingCents,
    overspent: spendingCents > incomeCents,
    spendingPercentOfIncome: ofIncome ? ofIncome.reduce((a, b) => a + b, 0) : null,
    incomeRows,
    expenseRows: spendRows.map((r, i) => ({
      name: r.name,
      cents: r.cents,
      percentOfIncome: ofIncome ? ofIncome[i] : null,
      shareOfSpending: shares ? shares[i] : null,
    })),
  };
}
