// Savings Goal Tracker math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/savings-goal-tracker/scripts/calc.py.
//
// Money is integer cents. The yearly rate is integer basis points (450 = 4.5%).
// How a month works (the same in both modes):
//   1. interest = balance * rate / 12, rounded half up to the cent (balance * bps / 120000)
//   2. the balance grows by that interest
//   3. the monthly amount is added at the end of the month
// Rounding is half up, once per month at step 1, and nowhere else.
// Month 1 is the start month. A goal met at the end of month k lands in the start month plus k - 1.
// This is an estimate from typed numbers. Real banks differ. It is not advice.
import { divRoundHalfUp, parseMoney, parseRate } from "../_shared/money.mjs";

export { formatMoney, formatRate } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000
export const MAX_RATE_BPS = 10000; // 100%
export const MAX_MONTHS = 1200; // 100 years
const D = 120000n;

/**
 * @typedef {{ mode: "when"|"by", goal: string, saved: string, monthly: string, rate: string, start: string, target: string }} SavingsInput
 * @typedef {{ field: "goal"|"saved"|"monthly"|"rate"|"start"|"target", kind: "missing"|"bad", message: string }} SavingsProblem
 * @typedef {{ year: number, depositsCents: number, interestCents: number, balanceCents: number }} YearRow
 * @typedef {{ ok: true, mode: "when", status: "reached"|"will-reach"|"no-savings"|"too-long", goalCents: number,
 *   savedCents: number, monthlyCents: number, rateBps: number, start: string, months: number|null,
 *   landing: string|null, finalBalanceCents: number, depositsCents: number, interestEarnedCents: number,
 *   byYear: YearRow[] }} WhenResult
 * @typedef {{ ok: true, mode: "by", status: "reached"|"needs", goalCents: number, savedCents: number,
 *   rateBps: number, start: string, months: number, target: string, monthlyNeededCents: number,
 *   finalBalanceCents: number, depositsCents: number, interestEarnedCents: number }} ByResult
 */

export const MESSAGES = {
  goalMissing: "Type your goal amount.",
  goalBad: "Goal amount: use a number above zero, like 5,000.",
  goalBig: "Goal amount: that is too big for this tool. Use $1,000,000,000 or less.",
  savedBad: "Already saved: use a dollar amount like 800, or leave it empty.",
  monthlyMissing: "Type how much you save each month. Type 0 if none.",
  monthlyBad: "Saved each month: use a dollar amount like 200.",
  rateBad: "Yearly interest rate: use a percent from 0 to 100, like 4.5. Use two decimals at most. Or leave it empty.",
  startBad: "Start month: type the year, a dash, then the month, like 2026-12.",
  startMissing: "Type the month you start saving, like 2026-12.",
  targetMissing: "Type the month you want to reach your goal, like 2028-06.",
  targetBad: "Goal month: type the year, a dash, then the month, like 2028-06.",
  targetEarly: "Goal month: pick the start month or a later month.",
  targetFar: "Goal month: that is more than 1,200 months away. Pick a nearer month.",
  tooBig: "These numbers are too big to work out. Try smaller ones.",
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/**
 * Read a month typed as YYYY-MM. Year 1900 to 2200, month 01 to 12.
 * @param {unknown} text
 * @returns {{ year: number, month: number } | null}
 */
export function parseMonth(text) {
  if (typeof text !== "string") return null;
  const m = /^(\d{4})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return null;
  return { year, month };
}

/** Text for a month index (year * 12 + month - 1). */
function monthText(index) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

const monthIndex = (p) => p.year * 12 + p.month - 1;

/**
 * Read the typed text. Returns the numbers, or a list of plain-words problems.
 * @param {Partial<SavingsInput>} input
 */
export function readSavingsInput(input) {
  const src = input && typeof input === "object" ? input : {};
  const mode = src.mode === "by" ? "by" : "when";
  /** @type {SavingsProblem[]} */
  const problems = [];
  const add = (field, kind, message) => problems.push({ field, kind, message });

  let goalCents = 0;
  if (isBlank(src.goal)) add("goal", "missing", MESSAGES.goalMissing);
  else {
    const v = parseMoney(src.goal);
    if (v === null || v <= 0) add("goal", "bad", MESSAGES.goalBad);
    else if (v > MAX_AMOUNT_CENTS) add("goal", "bad", MESSAGES.goalBig);
    else goalCents = v;
  }

  let savedCents = 0;
  if (!isBlank(src.saved)) {
    const v = parseMoney(src.saved);
    if (v === null || v < 0 || v > MAX_AMOUNT_CENTS) add("saved", "bad", MESSAGES.savedBad);
    else savedCents = v;
  }

  let monthlyCents = 0;
  if (mode === "when") {
    if (isBlank(src.monthly)) add("monthly", "missing", MESSAGES.monthlyMissing);
    else {
      const v = parseMoney(src.monthly);
      if (v === null || v < 0 || v > MAX_AMOUNT_CENTS) add("monthly", "bad", MESSAGES.monthlyBad);
      else monthlyCents = v;
    }
  }

  let rateBps = 0;
  if (!isBlank(src.rate)) {
    const v = parseRate(src.rate);
    if (v === null || v < 0 || v > MAX_RATE_BPS) add("rate", "bad", MESSAGES.rateBad);
    else rateBps = v;
  }

  let start = null;
  if (isBlank(src.start)) {
    if (mode === "by") add("start", "missing", MESSAGES.startMissing);
  } else {
    start = parseMonth(src.start);
    if (start === null) add("start", "bad", MESSAGES.startBad);
  }

  let months = 0;
  if (mode === "by") {
    if (isBlank(src.target)) add("target", "missing", MESSAGES.targetMissing);
    else {
      const t = parseMonth(src.target);
      if (t === null) add("target", "bad", MESSAGES.targetBad);
      else if (start !== null) {
        months = monthIndex(t) - monthIndex(start) + 1;
        if (months < 1) add("target", "bad", MESSAGES.targetEarly);
        else if (months > MAX_MONTHS) add("target", "bad", MESSAGES.targetFar);
      }
    }
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, mode, goalCents, savedCents, monthlyCents, rateBps, start, months };
}

/**
 * One month: interest on the balance (half up), then the deposit.
 * @param {bigint} balance
 * @param {bigint} deposit
 * @param {bigint} bps
 */
function step(balance, deposit, bps) {
  const interest = divRoundHalfUp(balance * bps, D);
  return { interest, balance: balance + interest + deposit };
}

const SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Month-by-month rows until the goal is met or `limit` months pass.
 * @returns {{ rows: { interest: bigint, deposit: bigint, balance: bigint }[], reachedAt: number|null }}
 */
function runUntilGoal(saved, monthly, bps, goal, limit) {
  let balance = BigInt(saved);
  const rows = [];
  for (let month = 1; month <= limit; month++) {
    const s = step(balance, BigInt(monthly), bps);
    balance = s.balance;
    rows.push({ interest: s.interest, deposit: BigInt(monthly), balance });
    if (balance >= BigInt(goal)) return { rows, reachedAt: month };
  }
  return { rows, reachedAt: null };
}

/** True when saving `monthly` for `months` months reaches the goal. Stops early once it does. */
function reaches(saved, monthly, bps, goal, months) {
  let balance = BigInt(saved);
  const g = BigInt(goal);
  const m = BigInt(monthly);
  for (let i = 0; i < months; i++) {
    balance = step(balance, m, bps).balance;
    if (balance >= g) return true;
  }
  return false;
}

/** @param {{ interest: bigint, deposit: bigint, balance: bigint }[]} rows @returns {YearRow[]} */
function groupByYear(rows) {
  const out = [];
  for (let start = 0; start < rows.length; start += 12) {
    const chunk = rows.slice(start, start + 12);
    out.push({
      year: start / 12 + 1,
      depositsCents: Number(chunk.reduce((a, r) => a + r.deposit, 0n)),
      interestCents: Number(chunk.reduce((a, r) => a + r.interest, 0n)),
      balanceCents: Number(chunk[chunk.length - 1].balance),
    });
  }
  return out;
}

/**
 * Months to reach the goal with a fixed monthly amount.
 * @returns {WhenResult|null}
 * status: "reached" (already there, 0 months), "will-reach", "no-savings" (nothing added and no
 * interest), "too-long" (not met within 1,200 months).
 */
function whenResult(v) {
  const base = {
    ok: true, mode: "when", goalCents: v.goalCents, savedCents: v.savedCents,
    monthlyCents: v.monthlyCents, rateBps: v.rateBps, start: v.start ? monthText(monthIndex(v.start)) : "",
  };
  if (v.savedCents >= v.goalCents) {
    return { ...base, status: "reached", months: 0, landing: null, finalBalanceCents: v.savedCents, depositsCents: 0, interestEarnedCents: 0, byYear: [] };
  }
  if (v.monthlyCents === 0 && v.rateBps === 0) {
    return { ...base, status: "no-savings", months: null, landing: null, finalBalanceCents: v.savedCents, depositsCents: 0, interestEarnedCents: 0, byYear: [] };
  }
  const run = runUntilGoal(v.savedCents, v.monthlyCents, BigInt(v.rateBps), v.goalCents, MAX_MONTHS);
  const last = run.rows[run.rows.length - 1].balance;
  if (last > SAFE) return null;
  const finalBalanceCents = Number(last);
  const n = run.rows.length;
  const depositsCents = v.monthlyCents * n;
  const interestEarnedCents = finalBalanceCents - v.savedCents - depositsCents;
  if (run.reachedAt === null) {
    return { ...base, status: "too-long", months: null, landing: null, finalBalanceCents, depositsCents, interestEarnedCents, byYear: [] };
  }
  return {
    ...base, status: "will-reach", months: n,
    landing: v.start ? monthText(monthIndex(v.start) + n - 1) : null,
    finalBalanceCents, depositsCents, interestEarnedCents, byYear: groupByYear(run.rows),
  };
}

/**
 * The smallest whole-cent monthly amount that reaches the goal in `months` months.
 * Found by a search on the same month-by-month rules, so the answer matches the schedule.
 * @returns {ByResult|null}
 */
function byResult(v) {
  const base = {
    ok: true, mode: "by", goalCents: v.goalCents, savedCents: v.savedCents, rateBps: v.rateBps,
    start: monthText(monthIndex(v.start)), months: v.months, target: monthText(monthIndex(v.start) + v.months - 1),
  };
  if (v.savedCents >= v.goalCents) {
    return { ...base, status: "reached", monthlyNeededCents: 0, finalBalanceCents: v.savedCents, depositsCents: 0, interestEarnedCents: 0 };
  }
  let lo = 0;
  let hi = v.goalCents; // saving the whole goal in month 1 always works
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (reaches(v.savedCents, mid, BigInt(v.rateBps), v.goalCents, v.months)) hi = mid;
    else lo = mid + 1;
  }
  let balance = BigInt(v.savedCents);
  for (let i = 0; i < v.months; i++) balance = step(balance, BigInt(lo), BigInt(v.rateBps)).balance;
  if (balance > SAFE) return null;
  const finalBalanceCents = Number(balance);
  const depositsCents = lo * v.months;
  return { ...base, status: "needs", monthlyNeededCents: lo, finalBalanceCents, depositsCents, interestEarnedCents: finalBalanceCents - v.savedCents - depositsCents };
}

/**
 * Typed text in, answer or plain-words problems out. Never throws, never gives NaN.
 * @param {Partial<SavingsInput>} input
 * @returns {WhenResult | ByResult | { ok: false, problems: SavingsProblem[] }}
 */
export function explainSavings(input) {
  const read = readSavingsInput(input);
  if (!read.ok) return read;
  const result = read.mode === "by" ? byResult(read) : whenResult(read);
  if (result === null) {
    return { ok: false, problems: [{ field: "goal", kind: "bad", message: MESSAGES.tooBig }] };
  }
  return result;
}
