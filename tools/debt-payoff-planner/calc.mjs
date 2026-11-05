// Debt Payoff Planner math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/debt-payoff-planner/scripts/calc.py.
//
// Money is integer cents. Rates are integer basis points (1999 = 19.99%).
// Rounding: half up to the cent, at ONE step only:
//   each month, each debt that still has a balance: interest = balance * rate / 12.
// Nothing else is rounded. Payments are whole cents already.
//
// Each month, in this order:
//   1. Every open debt gets its interest added.
//   2. Every open debt gets its smallest payment (or what is left of it, if less).
//   3. The rest of the month's money goes to the first open debt in the plan's line.
//      If that debt is cleared, the rest goes to the next one, and so on.
// The month's money is fixed: every starting smallest payment added up, plus the extra.
// So when a debt is cleared, its smallest payment rolls into the next debt.
//
// The line is set once, from the starting numbers:
//   snowball:  smallest starting balance first
//   avalanche: highest rate first
// A tie goes to the debt typed first.
// Stops at 1,200 months. This is an estimate from typed numbers. It is not advice.
import { formatMoney, parseMoney, parseRate } from "../_shared/money.mjs";

export { formatMoney, formatRate } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000
export const MAX_RATE_BPS = 10000; // 100%
export const MAX_MONTHS = 1200; // 100 years
export const MAX_DEBTS = 6;
const RATE_DEN = 120000; // monthly rate = bps / 120000

/**
 * @typedef {{ name: string, balance: string, rate: string, minimum: string }} DebtInput
 * @typedef {{ debts: Partial<DebtInput>[], extra: string }} PlannerInput
 * @typedef {{ field: string, kind: "missing"|"bad", message: string }} PlannerProblem
 * @typedef {{ name: string, balanceCents: number, rateBps: number, minimumCents: number }} Debt
 * @typedef {{ name: string, month: number }} PayoffStep
 * @typedef {{ months: number, totalInterestCents: number, totalPaidCents: number, order: PayoffStep[] }} PlanResult
 * @typedef {"snowball"|"avalanche"|"same"} Winner
 * @typedef {{ ok: true, debts: Debt[], extraCents: number, totalBalanceCents: number, monthlyMoneyCents: number,
 *   snowball: PlanResult, avalanche: PlanResult,
 *   difference: { monthsApart: number, fewerMonths: Winner, interestApartCents: number, lessInterest: Winner } }} PlannerResult
 */

const n = (row) => `Debt ${row}`;
export const MESSAGES = {
  noDebts: () => "Type at least one debt: its balance, yearly interest rate and smallest monthly payment.",
  tooMany: () => `This tool takes up to ${MAX_DEBTS} debts. Take some out to see an answer.`,
  balanceMissing: (r) => `${n(r)}: type the balance.`,
  balanceBad: (r) => `${n(r)} balance: use a number above zero, like 2,500.`,
  balanceBig: (r) => `${n(r)} balance: that is too big for this tool. Use $1,000,000,000 or less.`,
  rateMissing: (r) => `${n(r)}: type the yearly interest rate. Type 0 if there is none.`,
  rateBad: (r) => `${n(r)} interest rate: use a percent from 0 to 100, like 19.99. Use two decimals at most.`,
  minimumMissing: (r) => `${n(r)}: type the smallest payment due each month.`,
  minimumBad: (r) => `${n(r)} smallest payment: use a number above zero, like 35.`,
  minimumBig: (r) => `${n(r)} smallest payment: that is too big for this tool. Use $1,000,000,000 or less.`,
  minimumLow: (r, pay, interest) =>
    `${n(r)}: the smallest payment (${pay}) does not cover the first month's interest (${interest}). Paying only that never lowers this debt, so no payoff date can be worked out.`,
  extraBad: () => "Extra each month: use a dollar amount like 50, or leave it empty.",
  tooLong: () =>
    "At these numbers a debt would take more than 1,200 months (100 years) to pay off, so this tool stops here. Check the numbers.",
};

const isBlank = (t) => t === undefined || t === null || (typeof t === "string" && t.trim() === "");

/** Name text: control characters become spaces, ends trimmed, at most 40 characters. */
function cleanName(text) {
  if (typeof text !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return [...text.replace(/[\u0000-\u001f\u007f]/g, " ").trim()].slice(0, 40).join("").trim();
}

/** balance * bps / 12 months, rounded half up to the cent. Exact integer math. */
export function monthInterest(balanceCents, rateBps) {
  const top = 2 * balanceCents * rateBps + RATE_DEN;
  const bottom = 2 * RATE_DEN;
  return (top - (top % bottom)) / bottom;
}

/**
 * Read the typed text. Returns the numbers, or a list of plain-words problems.
 * @param {Partial<PlannerInput>} input
 * @returns {{ ok: true, debts: Debt[], extraCents: number } | { ok: false, problems: PlannerProblem[] }}
 */
export function readPlannerInput(input) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const rows = Array.isArray(src.debts) ? src.debts : [];
  /** @type {PlannerProblem[]} */
  const problems = [];
  const add = (field, kind, message) => problems.push({ field, kind, message });

  const used = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;
    if (isBlank(row.name) && isBlank(row.balance) && isBlank(row.rate) && isBlank(row.minimum)) return;
    used.push({ row, r: i + 1 });
  });

  /** @type {Debt[]} */
  const debts = [];
  if (used.length === 0) add("debts", "missing", MESSAGES.noDebts());
  else if (used.length > MAX_DEBTS) add("debts", "bad", MESSAGES.tooMany());
  else {
    for (const { row, r } of used) {
      let balanceCents = 0;
      if (isBlank(row.balance)) add(`balance${r}`, "missing", MESSAGES.balanceMissing(r));
      else {
        const v = parseMoney(row.balance);
        if (v === null || v <= 0) add(`balance${r}`, "bad", MESSAGES.balanceBad(r));
        else if (v > MAX_AMOUNT_CENTS) add(`balance${r}`, "bad", MESSAGES.balanceBig(r));
        else balanceCents = v;
      }
      let rateBps = 0;
      if (isBlank(row.rate)) add(`rate${r}`, "missing", MESSAGES.rateMissing(r));
      else {
        const v = parseRate(row.rate);
        if (v === null || v < 0 || v > MAX_RATE_BPS) add(`rate${r}`, "bad", MESSAGES.rateBad(r));
        else rateBps = v;
      }
      let minimumCents = 0;
      if (isBlank(row.minimum)) add(`minimum${r}`, "missing", MESSAGES.minimumMissing(r));
      else {
        const v = parseMoney(row.minimum);
        if (v === null || v <= 0) add(`minimum${r}`, "bad", MESSAGES.minimumBad(r));
        else if (v > MAX_AMOUNT_CENTS) add(`minimum${r}`, "bad", MESSAGES.minimumBig(r));
        else minimumCents = v;
      }
      debts.push({ name: cleanName(row.name) || n(r), balanceCents, rateBps, minimumCents, row: r });
    }
  }

  let extraCents = 0;
  if (!isBlank(src.extra)) {
    const v = parseMoney(src.extra);
    if (v === null || v < 0 || v > MAX_AMOUNT_CENTS) add("extra", "bad", MESSAGES.extraBad());
    else extraCents = v;
  }

  if (problems.length === 0) {
    for (const d of debts) {
      const interest = monthInterest(d.balanceCents, d.rateBps);
      if (interest >= d.minimumCents) {
        add(`minimum${d.row}`, "bad", MESSAGES.minimumLow(d.row, formatMoney(d.minimumCents), formatMoney(interest)));
      }
    }
  }
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, debts: debts.map(({ row, ...d }) => d), extraCents };
}

/**
 * Run one plan month by month.
 * @param {Debt[]} debts
 * @param {number} extraCents
 * @param {number[]} line debt positions, first to be paid down first
 * @returns {PlanResult|null} null if not clear within 1,200 months
 */
export function runPlan(debts, extraCents, line) {
  const bal = debts.map((d) => d.balanceCents);
  const doneMonth = debts.map(() => 0);
  const monthly = debts.reduce((a, d) => a + d.minimumCents, 0) + extraCents;
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  while (bal.some((b) => b > 0)) {
    if (month >= MAX_MONTHS) return null;
    month += 1;
    let left = monthly;
    debts.forEach((d, i) => {
      if (bal[i] <= 0) return;
      const interest = monthInterest(bal[i], d.rateBps);
      bal[i] += interest;
      totalInterest += interest;
    });
    debts.forEach((d, i) => {
      if (bal[i] <= 0) return;
      const pay = Math.min(d.minimumCents, bal[i]);
      bal[i] -= pay;
      left -= pay;
    });
    for (const i of line) {
      if (left <= 0) break;
      if (bal[i] <= 0) continue;
      const pay = Math.min(left, bal[i]);
      bal[i] -= pay;
      left -= pay;
    }
    totalPaid += monthly - left;
    debts.forEach((d, i) => {
      if (bal[i] === 0 && doneMonth[i] === 0) doneMonth[i] = month;
    });
  }
  const order = debts
    .map((d, i) => ({ name: d.name, month: doneMonth[i], at: line.indexOf(i) }))
    .sort((a, b) => a.month - b.month || a.at - b.at)
    .map(({ name, month: m }) => ({ name, month: m }));
  return { months: month, totalInterestCents: totalInterest, totalPaidCents: totalPaid, order };
}

/** Positions 0..k-1 sorted by a numeric key, ties by position. */
const lineBy = (debts, key) =>
  debts.map((_, i) => i).sort((a, b) => key(debts[a]) - key(debts[b]) || a - b);

/**
 * Work out both plans from numbers already read.
 * @param {{ debts: Debt[], extraCents?: number }} v
 * @returns {PlannerResult|null} null if a plan passes 1,200 months
 */
export function calcPlans(v) {
  const extraCents = v.extraCents ?? 0;
  const snowball = runPlan(v.debts, extraCents, lineBy(v.debts, (d) => d.balanceCents));
  const avalanche = runPlan(v.debts, extraCents, lineBy(v.debts, (d) => -d.rateBps));
  if (snowball === null || avalanche === null) return null;
  const monthsApart = snowball.months - avalanche.months;
  const interestApart = snowball.totalInterestCents - avalanche.totalInterestCents;
  return {
    ok: /** @type {const} */ (true),
    debts: v.debts,
    extraCents,
    totalBalanceCents: v.debts.reduce((a, d) => a + d.balanceCents, 0),
    monthlyMoneyCents: v.debts.reduce((a, d) => a + d.minimumCents, 0) + extraCents,
    snowball,
    avalanche,
    difference: {
      monthsApart: Math.abs(monthsApart),
      fewerMonths: monthsApart === 0 ? "same" : monthsApart > 0 ? "avalanche" : "snowball",
      interestApartCents: Math.abs(interestApart),
      lessInterest: interestApart === 0 ? "same" : interestApart > 0 ? "avalanche" : "snowball",
    },
  };
}

/**
 * Typed text in, answer or plain-words problems out. Never throws, never gives NaN.
 * @param {Partial<PlannerInput>} input
 * @returns {PlannerResult | { ok: false, problems: PlannerProblem[] }}
 */
export function planDebtPayoff(input) {
  const read = readPlannerInput(input);
  if (!read.ok) return read;
  const result = calcPlans(read);
  if (result === null) return { ok: false, problems: [{ field: "debts", kind: "bad", message: MESSAGES.tooLong() }] };
  return result;
}
