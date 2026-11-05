// Student Loan Growth and Payoff math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/student-loan-growth-and-payoff/scripts/calc.py.
//
// Money is integer cents. Rates are integer basis points (650 = 6.5%).
// This is an ESTIMATE. Real loans add interest daily. Here it is approximated as monthly.
// Rounding: half up to the cent, only at these steps:
//   1. each month's interest = principal * rate / 12 (see money.mjs divRoundHalfUp)
//   2. nothing else is rounded. Waiting interest is that one rounded month times the months waited.
// While no payments are made: unpaid interest = months * monthInterest(principal). No compounding.
// When payments start with the toggle OFF: the unpaid interest stays apart. Interest keeps being
//   figured on the original principal only. Each payment pays unpaid interest first, then principal.
// When payments start with the toggle ON: the unpaid interest is added to the principal first.
// The last payment is trued up so the balance ends at exactly 0.
// Minimum payment for N years: the smallest whole-cent payment that clears the loan in N*12 payments
//   (the last payment may be smaller). Found by trying payments and running the same schedule.
import { divRoundHalfUp, parseMoney, parseRate, parseWholeNumber } from "../_shared/money.mjs";

export { formatMoney, formatRate } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000
export const MAX_RATE_BPS = 10000; // 100%
export const MAX_WAIT_MONTHS = 600; // 50 years of no payments
export const MAX_PAYOFF_MONTHS = 1200; // 100 years
export const MAX_YEARS = 100;
export const MIN_START_YEAR = 2000;
export const MAX_START_YEAR = 2200;
const RATE_DENOMINATOR = 120000n; // monthly rate = bps / 120000

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * @typedef {{ balance: string, rate: string, waitMonths: string, capitalize: boolean|string, payment: string, start: string, years: string }} StudentInput
 * @typedef {{ field: "balance"|"rate"|"waitMonths"|"payment"|"start"|"years", kind: "missing"|"bad", message: string }} StudentProblem
 * @typedef {{ year: number, paidCents: number, interestCents: number, principalCents: number, balanceCents: number }} YearRow
 * @typedef {{ year: number, month: number, label: string }} DateInfo
 * @typedef {{ months: number, totalPaidCents: number, totalInterestCents: number, payoffDate: DateInfo|null, byYear: YearRow[] }} PayoffInfo
 * @typedef {{ years: number, months: number, paymentCents: number }} MinPaymentInfo
 * @typedef {{ ok: true, principalCents: number, rateBps: number, waitMonths: number, capitalize: boolean,
 *   paymentCents: number|null, monthlyInterestCents: number, unpaidInterestCents: number, balanceAtStartCents: number,
 *   payoff: PayoffInfo|null, minPayment: MinPaymentInfo|null }} StudentResult
 * @typedef {{ ok: false, problems: StudentProblem[] }} StudentFailure
 */

export const MESSAGES = {
  balanceMissing: "Type your loan balance.",
  balanceBad: "Loan balance: use a number above zero, like 12,000.",
  balanceBig: "Loan balance: that is too big for this tool. Use $1,000,000,000 or less.",
  rateMissing: "Type the yearly interest rate. Type 0 if there is none.",
  rateBad: "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
  waitBad: "Months with no payments: use a whole number from 0 to 600, or leave it empty.",
  paymentBad: "Monthly payment: use a dollar amount above zero, like 150, or leave it empty.",
  paymentSmall: "Monthly payment: that is too small to pay off the loan in 100 years. Try a bigger payment.",
  startBad: "Payments start: type the year, a dash, then the month, like 2026-09.",
  yearsBad: "Years to pay off: use a whole number from 1 to 100, or leave it empty.",
  tooBig: "These numbers are too big to work out. Try smaller ones.",
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/** @param {unknown} v */
function readToggle(v) {
  return v === true || (typeof v === "string" && ["true", "yes", "on"].includes(v.trim().toLowerCase()));
}

/**
 * Read the typed text. Returns the numbers, or a list of plain-words problems.
 * @param {Partial<StudentInput>} input
 * @returns {{ ok: true, principalCents: number, rateBps: number, waitMonths: number, capitalize: boolean,
 *   paymentCents: number|null, start: {year:number,month:number}|null, years: number|null } | StudentFailure}
 */
export function readStudentInput(input) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  /** @type {StudentProblem[]} */
  const problems = [];
  const add = (field, kind, message) => problems.push({ field, kind, message });

  let principalCents = 0;
  if (isBlank(src.balance)) add("balance", "missing", MESSAGES.balanceMissing);
  else {
    const v = parseMoney(src.balance);
    if (v === null || v <= 0) add("balance", "bad", MESSAGES.balanceBad);
    else if (v > MAX_AMOUNT_CENTS) add("balance", "bad", MESSAGES.balanceBig);
    else principalCents = v;
  }

  let rateBps = 0;
  if (isBlank(src.rate)) add("rate", "missing", MESSAGES.rateMissing);
  else {
    const v = parseRate(src.rate);
    if (v === null || v < 0 || v > MAX_RATE_BPS) add("rate", "bad", MESSAGES.rateBad);
    else rateBps = v;
  }

  let waitMonths = 0;
  if (!isBlank(src.waitMonths)) {
    const n = parseWholeNumber(src.waitMonths);
    if (n === null || n > MAX_WAIT_MONTHS) add("waitMonths", "bad", MESSAGES.waitBad);
    else waitMonths = n;
  }

  /** @type {number|null} */
  let paymentCents = null;
  if (!isBlank(src.payment)) {
    const v = parseMoney(src.payment);
    if (v === null || v <= 0 || v > MAX_AMOUNT_CENTS) add("payment", "bad", MESSAGES.paymentBad);
    else paymentCents = v;
  }

  /** @type {{ year: number, month: number }|null} */
  let start = null;
  if (!isBlank(src.start)) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(src.start).trim());
    const year = m ? Number(m[1]) : 0;
    const month = m ? Number(m[2]) : 0;
    if (!m || month < 1 || month > 12 || year < MIN_START_YEAR || year > MAX_START_YEAR) add("start", "bad", MESSAGES.startBad);
    else start = { year, month };
  }

  /** @type {number|null} */
  let years = null;
  if (!isBlank(src.years)) {
    const n = parseWholeNumber(src.years);
    if (n === null || n < 1 || n > MAX_YEARS) add("years", "bad", MESSAGES.yearsBad);
    else years = n;
  }

  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    principalCents,
    rateBps,
    waitMonths,
    capitalize: readToggle(src.capitalize),
    paymentCents,
    start,
    years,
  };
}

/** @param {bigint} balance @param {bigint} bps */
const monthInterest = (balance, bps) => divRoundHalfUp(balance * bps, RATE_DENOMINATOR);

/**
 * Run the payoff schedule. Returns null when the loan is not clear after maxMonths payments.
 * @param {bigint} principal interest-bearing money
 * @param {bigint} accrued unpaid interest, kept apart (0 when it was added to the principal)
 * @param {bigint} bps
 * @param {bigint} pay
 * @param {number} maxMonths
 * @param {boolean} wantRows
 */
function runSchedule(principal, accrued, bps, pay, maxMonths, wantRows) {
  let p = principal;
  let a = accrued;
  let paid = 0n;
  const rows = [];
  let month = 0;
  while ((p > 0n || a > 0n) && month < maxMonths) {
    month++;
    a += monthInterest(p, bps);
    const due = a + p;
    const pmt = pay >= due ? due : pay;
    const toInterest = pmt < a ? pmt : a;
    a -= toInterest;
    p -= pmt - toInterest;
    paid += pmt;
    if (wantRows) {
      rows.push({
        paymentCents: Number(pmt),
        interestCents: Number(toInterest),
        principalCents: Number(pmt - toInterest),
        balanceCents: Number(p + a),
      });
    }
  }
  if (p > 0n || a > 0n) return null;
  return { months: month, paid, rows };
}

/**
 * Group payment rows into payoff years (12 payments each; the last year may be shorter).
 * @param {{ paymentCents: number, interestCents: number, principalCents: number, balanceCents: number }[]} rows
 * @returns {YearRow[]}
 */
export function groupByYear(rows) {
  /** @type {YearRow[]} */
  const out = [];
  for (let s = 0; s < rows.length; s += 12) {
    const chunk = rows.slice(s, s + 12);
    out.push({
      year: s / 12 + 1,
      paidCents: chunk.reduce((a, r) => a + r.paymentCents, 0),
      interestCents: chunk.reduce((a, r) => a + r.interestCents, 0),
      principalCents: chunk.reduce((a, r) => a + r.principalCents, 0),
      balanceCents: chunk[chunk.length - 1].balanceCents,
    });
  }
  return out;
}

/**
 * The month that is `offset` months after year-month `start`.
 * @param {{ year: number, month: number }} start
 * @param {number} offset
 * @returns {DateInfo}
 */
export function addMonths(start, offset) {
  const index = start.year * 12 + (start.month - 1) + offset;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` };
}

/**
 * Smallest whole-cent payment that clears the loan in `months` payments.
 * @param {bigint} principal @param {bigint} accrued @param {bigint} bps @param {number} months
 * @returns {number}
 */
export function minimumPayment(principal, accrued, bps, months) {
  let lo = 1n;
  let hi = principal + accrued + monthInterest(principal, bps) + 1n; // clears the loan in one payment
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (runSchedule(principal, accrued, bps, mid, months, false) !== null) hi = mid;
    else lo = mid + 1n;
  }
  return Number(lo);
}

/**
 * Work out a student loan from numbers already read.
 * @param {{ principalCents: number, rateBps: number, waitMonths: number, capitalize: boolean,
 *   paymentCents: number|null, start: {year:number,month:number}|null, years: number|null }} v
 * @returns {StudentResult | StudentFailure | null} null only if a number is out of range
 */
export function calcStudentLoan(v) {
  const principal = BigInt(v.principalCents);
  const bps = BigInt(v.rateBps);
  const waitInterest = monthInterest(principal, bps);
  const accrued = waitInterest * BigInt(v.waitMonths);
  const balanceAtStart = principal + accrued;
  if (balanceAtStart > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  // Which money earns interest once payments start.
  const bearing = v.capitalize ? balanceAtStart : principal;
  const apart = v.capitalize ? 0n : accrued;

  /** @type {PayoffInfo|null} */
  let payoff = null;
  if (v.paymentCents !== null) {
    const run = runSchedule(bearing, apart, bps, BigInt(v.paymentCents), MAX_PAYOFF_MONTHS, true);
    if (run === null) return { ok: false, problems: [{ field: "payment", kind: "bad", message: MESSAGES.paymentSmall }] };
    payoff = {
      months: run.months,
      totalPaidCents: Number(run.paid),
      totalInterestCents: Number(run.paid - principal),
      payoffDate: v.start ? addMonths(v.start, run.months - 1) : null,
      byYear: groupByYear(run.rows),
    };
  }

  /** @type {MinPaymentInfo|null} */
  let minPayment = null;
  if (v.years !== null) {
    minPayment = { years: v.years, months: v.years * 12, paymentCents: minimumPayment(bearing, apart, bps, v.years * 12) };
  }

  return {
    ok: true,
    principalCents: v.principalCents,
    rateBps: v.rateBps,
    waitMonths: v.waitMonths,
    capitalize: v.capitalize,
    paymentCents: v.paymentCents,
    monthlyInterestCents: Number(waitInterest),
    unpaidInterestCents: Number(accrued),
    balanceAtStartCents: Number(balanceAtStart),
    payoff,
    minPayment,
  };
}

/**
 * Typed text in, answer or plain-words problems out. Never throws, never gives NaN.
 * @param {Partial<StudentInput>} input
 * @returns {StudentResult | StudentFailure}
 */
export function explainStudentLoan(input) {
  const read = readStudentInput(input);
  if (!read.ok) return read;
  const result = calcStudentLoan(read);
  if (result === null) return { ok: false, problems: [{ field: "balance", kind: "bad", message: MESSAGES.tooBig }] };
  return result;
}
