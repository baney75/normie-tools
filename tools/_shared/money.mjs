// Shared money math for NT calculators. Pure ES module, no dependencies, no network.
//
// Rules every tool copies:
//   1. Money is INTEGER CENTS. Never a float dollar amount.
//   2. A rate is INTEGER BASIS POINTS (hundredths of a percent): 6.5% is 650.
//   3. Text is parsed exactly (digit by digit). No parseFloat, no Number("1e3").
//   4. Big math uses BigInt. Rounding is "half up" (0.5 goes to the next whole
//      cent), done once per stated step and documented at that step.
//   5. Bad input gives null, never NaN and never a throw.
//
// Python copies of this math live in each skill's scripts/calc.py. They are not shared.

/** @typedef {{ month: number, paymentCents: number, interestCents: number, principalCents: number, balanceCents: number }} ScheduleRow */

/** The largest cent value these helpers accept. Keeps every result a safe integer. */
export const MAX_CENTS = Number.MAX_SAFE_INTEGER;

/** Months have 12 per year and a basis point is 1/10000, so a monthly rate is bps / 120000. */
export const MONTHLY_RATE_DENOMINATOR = 120000n;

/**
 * Divide two BigInts and round half up (half away from zero for negatives).
 * @param {bigint} num
 * @param {bigint} den must be positive
 * @returns {bigint}
 */
export function divRoundHalfUp(num, den) {
  if (den <= 0n) throw new RangeError("den must be positive");
  const neg = num < 0n;
  const n = neg ? -num : num;
  const q = (2n * n + den) / (2n * den);
  return neg ? -q : q;
}

/**
 * Round a ratio of integers to a whole number, half up. Safe-integer in, number out.
 * Returns null when the result would not be a safe integer.
 * @param {number|bigint} num
 * @param {number|bigint} den positive
 * @returns {number|null}
 */
export function roundHalfUp(num, den) {
  try {
    const q = divRoundHalfUp(BigInt(num), BigInt(den));
    return fitsSafe(q) ? Number(q) : null;
  } catch {
    return null;
  }
}

function fitsSafe(big) {
  return big <= BigInt(Number.MAX_SAFE_INTEGER) && big >= -BigInt(Number.MAX_SAFE_INTEGER);
}

/** @param {unknown} text */
function clean(text) {
  if (typeof text === "number") return Number.isFinite(text) ? String(text) : "";
  if (typeof text !== "string") return "";
  return text.trim();
}

// Plain digits, or digits grouped by commas in threes. Optional "." and fraction digits.
const NUMBER_RE = /^(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d*))?$/;

/**
 * Split typed text like "$1,234.50" into sign, whole digits, fraction digits.
 * Accepts one leading "-" and an optional "$" (money only). Anything else gives null.
 * @param {unknown} text
 * @param {{ dollar: boolean, percent: boolean }} opts
 */
function splitNumber(text, { dollar, percent }) {
  let s = clean(text);
  if (s === "") return null;
  let neg = false;
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1).trim();
  }
  if (dollar && s.startsWith("$")) s = s.slice(1).trim();
  if (percent && s.endsWith("%")) s = s.slice(0, -1).trim();
  const m = NUMBER_RE.exec(s);
  if (!m) return null;
  const whole = (m[1] ?? "").replace(/,/g, "");
  const frac = m[2] ?? "";
  if (whole === "" && frac === "") return null;
  return { neg, whole: whole === "" ? "0" : whole, frac };
}

/**
 * Parse typed money into integer cents, exactly.
 * "1,000" -> 100000, "$1,000.50" -> 100050, " 12 " -> 1200, ".5" -> 50.
 * More than two decimal digits (other than trailing zeros), exponents, words,
 * emoji, blank, or a result too big for a safe integer all give null.
 * A leading minus is kept (-500 for "-5"), so the caller can say "not negative".
 * @param {unknown} text
 * @returns {number|null}
 */
export function parseMoney(text) {
  const p = splitNumber(text, { dollar: true, percent: false });
  if (!p) return null;
  const frac = p.frac.replace(/0+$/, "");
  if (frac.length > 2) return null;
  const cents = BigInt(p.whole) * 100n + BigInt((frac + "00").slice(0, 2));
  if (!fitsSafe(cents)) return null;
  const n = Number(cents);
  return p.neg ? (n === 0 ? 0 : -n) : n;
}

/**
 * Parse a typed percent into basis points (hundredths of a percent), exactly.
 * "6.5" -> 650, "6.5%" -> 650, "0" -> 0, "12.25" -> 1225.
 * More than two decimal digits (other than trailing zeros) gives null.
 * A leading minus is kept so the caller can say "not negative".
 * @param {unknown} text
 * @returns {number|null}
 */
export function parseRate(text) {
  const p = splitNumber(text, { dollar: false, percent: true });
  if (!p) return null;
  const frac = p.frac.replace(/0+$/, "");
  if (frac.length > 2) return null;
  const bps = BigInt(p.whole) * 100n + BigInt((frac + "00").slice(0, 2));
  if (bps > 100000000n) return null; // far beyond any real rate; keeps later math small
  const n = Number(bps);
  return p.neg ? (n === 0 ? 0 : -n) : n;
}

/**
 * Parse a whole number such as a number of months. Digits only (commas in threes ok).
 * @param {unknown} text
 * @returns {number|null}
 */
export function parseWholeNumber(text) {
  const p = splitNumber(text, { dollar: false, percent: false });
  if (!p || p.neg || p.whole.length > 15) return null;
  if (!/^0*$/.test(p.frac)) return null;
  return Number(p.whole);
}

/**
 * Format integer cents as dollars with a thousands comma: 123456 -> "$1,234.56".
 * Negative cents give "-$1.00". A non-integer or unsafe value gives "".
 * @param {number} cents
 * @returns {string}
 */
export function formatMoney(cents) {
  if (typeof cents !== "number" || !Number.isSafeInteger(cents)) return "";
  const neg = cents < 0;
  const abs = BigInt(neg ? -cents : cents);
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

/**
 * Format basis points as a percent: 650 -> "6.5%", 1225 -> "12.25%", 0 -> "0%".
 * @param {number} bps
 * @returns {string}
 */
export function formatRate(bps) {
  if (typeof bps !== "number" || !Number.isSafeInteger(bps)) return "";
  const neg = bps < 0;
  const abs = neg ? -bps : bps;
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}%`;
}

/**
 * Level monthly payment on a fixed-rate loan, in cents.
 *
 * Standard formula with monthly rate i = annualRateBps / 120000:
 *   payment = P * i / (1 - (1 + i)^-n)
 * Worked as one exact fraction (no float):
 *   with D = 120000 and B = annualRateBps,
 *   payment = P * B * (D + B)^n / ( D * ((D + B)^n - D^n) )
 * Rounded half up to the cent ONCE, at the end. At a rate of 0 it is P / n, rounded half up.
 * A payment never rounds below 1 cent (a loan of a few cents would otherwise show 0).
 *
 * @param {number} principalCents positive integer
 * @param {number} annualRateBps integer 0 or more
 * @param {number} months integer 1 or more
 * @returns {number|null} cents, or null when an input is not valid
 */
export function monthlyPayment(principalCents, annualRateBps, months) {
  if (!Number.isSafeInteger(principalCents) || principalCents <= 0) return null;
  if (!Number.isSafeInteger(annualRateBps) || annualRateBps < 0) return null;
  if (!Number.isSafeInteger(months) || months < 1 || months > 12000) return null;
  const P = BigInt(principalCents);
  const n = BigInt(months);
  const B = BigInt(annualRateBps);
  let result;
  if (B === 0n) {
    result = divRoundHalfUp(P, n);
  } else {
    const D = MONTHLY_RATE_DENOMINATOR;
    const up = (D + B) ** n;
    const base = D ** n;
    result = divRoundHalfUp(P * B * up, D * (up - base));
  }
  if (result < 1n) result = 1n;
  return fitsSafe(result) ? Number(result) : null;
}

/**
 * Interest for one month on a balance, in cents: balance * bps / 120000, rounded half up.
 * @param {bigint} balance
 * @param {bigint} bps
 */
function monthInterest(balance, bps) {
  return divRoundHalfUp(balance * bps, MONTHLY_RATE_DENOMINATOR);
}

/**
 * Month-by-month schedule for a fixed-rate loan.
 *
 * Each month: interest = balance * rate / 12, rounded half up to the cent. The payment
 * (plus any extra) first covers that interest; the rest lowers the balance. The last
 * payment is trued up to clear the balance exactly: balance + that month's interest.
 * It happens in month `months` for the plain schedule, or earlier when there is an extra.
 *
 * @param {number} principalCents
 * @param {number} annualRateBps
 * @param {number} months scheduled number of months
 * @param {{ paymentCents?: number, extraCents?: number }} [opts]
 *   paymentCents defaults to monthlyPayment(...). extraCents is added to every payment.
 * @returns {{ rows: ScheduleRow[], totalPaidCents: number, totalInterestCents: number } | null}
 */
export function amortize(principalCents, annualRateBps, months, opts = {}) {
  const base = opts.paymentCents ?? monthlyPayment(principalCents, annualRateBps, months);
  const extra = opts.extraCents ?? 0;
  if (base === null || !Number.isSafeInteger(extra) || extra < 0) return null;
  if (!Number.isSafeInteger(base) || base <= 0) return null;
  const bps = BigInt(annualRateBps);
  const pay = BigInt(base) + BigInt(extra);
  let balance = BigInt(principalCents);
  let totalPaid = 0n;
  let totalInterest = 0n;
  /** @type {ScheduleRow[]} */
  const rows = [];
  for (let month = 1; balance > 0n && month <= months; month++) {
    const interest = monthInterest(balance, bps);
    let pmt = pay;
    // True up: the last scheduled month, or any month where the payment clears the rest.
    if (month === months || pmt >= balance + interest) pmt = balance + interest;
    const principalPart = pmt - interest;
    balance -= principalPart;
    totalPaid += pmt;
    totalInterest += interest;
    rows.push({
      month,
      paymentCents: Number(pmt),
      interestCents: Number(interest),
      principalCents: Number(principalPart),
      balanceCents: Number(balance),
    });
  }
  if (!fitsSafe(totalPaid)) return null;
  return { rows, totalPaidCents: Number(totalPaid), totalInterestCents: Number(totalInterest) };
}
