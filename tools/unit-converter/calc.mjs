// Unit Converter math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/unit-converter/scripts/calc.py.
//
// No money here, so no cents. Everything is exact fractions of BigInt integers.
// Each unit is an exact fraction of a base unit (meter, kilogram, liter, meter per second).
// Temperature is exact too: every scale is a fixed shift and scale from kelvin.
// The only rounding is the last step: the answer is rounded half up to 6 significant digits.
//
// Definitions (international, exact):
//   1 inch = 25.4 mm, 1 foot = 12 inches, 1 yard = 3 feet, 1 mile = 5280 feet
//   1 pound = 0.45359237 kg, 1 ounce = 1/16 pound
//   1 US gallon = 231 cubic inches = 3.785411784 L, quart = 1/4, pint = 1/8, cup = 1/16,
//   fluid ounce = 1/128, tablespoon = 1/256, teaspoon = 1/768 of a gallon
//   0 degrees C = 273.15 K, F = C * 9/5 + 32
//   1 mph = 1609.344 m per 3600 s, 1 km/h = 1000 m per 3600 s
// This is an estimate shown to 6 digits. It is not advice.
import { divRoundHalfUp } from "../_shared/money.mjs";

export const MAX_WHOLE_DIGITS = 12;
export const MAX_FRACTION_DIGITS = 9;
export const SIG_DIGITS = 6;

/** @typedef {{ id: string, name: string, short: string, n?: bigint, d?: bigint }} Unit */

const f = (id, name, short, n, d) => ({ id, name, short, n: BigInt(n), d: BigInt(d) });

/** Each unit is n/d of its category base. */
export const CATEGORIES = {
  length: {
    label: "Length",
    units: [
      f("inch", "inches", "in", 254, 10000),
      f("foot", "feet", "ft", 3048, 10000),
      f("yard", "yards", "yd", 9144, 10000),
      f("mile", "miles", "mi", 1609344, 1000),
      f("millimeter", "millimeters", "mm", 1, 1000),
      f("centimeter", "centimeters", "cm", 1, 100),
      f("meter", "meters", "m", 1, 1),
      f("kilometer", "kilometers", "km", 1000, 1),
    ],
  },
  weight: {
    label: "Weight",
    units: [
      f("ounce", "ounces", "oz", 45359237, 1600000000),
      f("pound", "pounds", "lb", 45359237, 100000000),
      f("gram", "grams", "g", 1, 1000),
      f("kilogram", "kilograms", "kg", 1, 1),
    ],
  },
  volume: {
    label: "Volume",
    units: [
      f("teaspoon", "teaspoons", "tsp", 3785411784, 768000000000),
      f("tablespoon", "tablespoons", "tbsp", 3785411784, 256000000000),
      f("fluid-ounce", "US fluid ounces", "fl oz", 3785411784, 128000000000),
      f("cup", "US cups", "cup", 3785411784, 16000000000),
      f("pint", "US pints", "pt", 3785411784, 8000000000),
      f("quart", "US quarts", "qt", 3785411784, 4000000000),
      f("gallon", "US gallons", "gal", 3785411784, 1000000000),
      f("milliliter", "milliliters", "mL", 1, 1000),
      f("liter", "liters", "L", 1, 1),
    ],
  },
  temperature: {
    label: "Temperature",
    units: [
      { id: "fahrenheit", name: "degrees Fahrenheit", short: "°F" },
      { id: "celsius", name: "degrees Celsius", short: "°C" },
      { id: "kelvin", name: "kelvins", short: "K" },
    ],
  },
  speed: {
    label: "Speed",
    units: [
      f("mph", "miles per hour", "mph", 1609344, 3600000),
      f("kmh", "kilometers per hour", "km/h", 1000, 3600),
    ],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** First unit and a sensible second unit for each kind, for a blank start. */
export const DEFAULT_UNITS = {
  length: ["inch", "millimeter"],
  weight: ["pound", "kilogram"],
  volume: ["cup", "milliliter"],
  temperature: ["fahrenheit", "celsius"],
  speed: ["mph", "kmh"],
};

export const MESSAGES = {
  valueMissing: "Type the number you want to change.",
  valueBad: "Number: use digits like 12 or 3.5. Leave out letters and extra signs.",
  valueNegative: "Number: use zero or more for this kind of unit.",
  valueCold: "Number: that is colder than anything can be. Type a warmer number.",
  valueBig: "Number: that is too big for this tool. Use fewer than 13 digits before the dot.",
  categoryBad: "Kind: pick one from the list.",
  fromBad: "Change from: pick a unit from the list.",
  toBad: "Change to: pick a unit from the list.",
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";
const NUMBER_RE = /^(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d*))?$/;

/**
 * Read typed text exactly into a fraction. "1,000" and " 12 " and "3.5" and "-40" are fine.
 * Exponents, words, emoji, NaN, a second dot or sign give null.
 * @param {unknown} text
 * @returns {{ neg: boolean, n: bigint, d: bigint } | "big" | null}
 */
export function parseDecimal(text) {
  if (typeof text === "number") text = Number.isFinite(text) ? String(text) : "";
  if (typeof text !== "string") return null;
  let s = text.trim();
  let neg = false;
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1).trim();
  }
  const m = NUMBER_RE.exec(s);
  if (!m) return null;
  const whole = (m[1] ?? "").replace(/,/g, "");
  const frac = (m[2] ?? "").replace(/0+$/, "");
  if (whole === "" && (m[2] ?? "") === "") return null;
  const w = whole.replace(/^0+/, "");
  if (w.length > MAX_WHOLE_DIGITS || frac.length > MAX_FRACTION_DIGITS) return "big";
  const d = 10n ** BigInt(frac.length);
  const n = BigInt((w || "0") + frac);
  return { neg: neg && n !== 0n, n, d };
}

const gcd = (a, b) => {
  a = a < 0n ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
};
const frac = (n, d) => {
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};
const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
const div = (a, b) => frac(a.n * b.d, a.d * b.n);
const K0 = frac(27315n, 100n); // 0 degrees C in kelvin
const F32 = frac(32n, 1n);
const NINE_FIFTHS = frac(9n, 5n);

/** Value in kelvin from a temperature unit. */
function toKelvin(id, v) {
  if (id === "kelvin") return v;
  if (id === "celsius") return add(v, K0);
  return add(mul(sub(v, F32), frac(5n, 9n)), K0); // fahrenheit
}
function fromKelvin(id, k) {
  if (id === "kelvin") return k;
  const c = sub(k, K0);
  if (id === "celsius") return c;
  return add(mul(c, NINE_FIFTHS), F32);
}

const pow10 = (e) => 10n ** BigInt(e);

/**
 * Round a positive fraction to 6 significant digits, half up, and print it as plain digits
 * with commas in the whole part. "25.4", "0.000000621371", "1,234,570".
 * @param {bigint} n
 * @param {bigint} d positive
 */
export function formatSignificant(n, d) {
  if (n === 0n) return "0";
  // e is the power of ten with 10^e <= n/d < 10^(e+1).
  const atLeast = (e) => (e >= 0 ? n >= d * pow10(e) : n * pow10(-e) >= d);
  let e = n.toString().length - d.toString().length;
  while (!atLeast(e)) e--;
  while (atLeast(e + 1)) e++;
  const k = SIG_DIGITS - 1 - e;
  let q = k >= 0 ? divRoundHalfUp(n * pow10(k), d) : divRoundHalfUp(n, d * pow10(-k));
  if (q === pow10(SIG_DIGITS)) {
    q = pow10(SIG_DIGITS - 1);
    e++;
  }
  const s = q.toString();
  let whole;
  let fraction;
  if (e >= SIG_DIGITS - 1) {
    whole = s + "0".repeat(e - (SIG_DIGITS - 1));
    fraction = "";
  } else if (e >= 0) {
    whole = s.slice(0, e + 1);
    fraction = s.slice(e + 1).replace(/0+$/, "");
  } else {
    whole = "0";
    fraction = ("0".repeat(-e - 1) + s).replace(/0+$/, "");
  }
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * @typedef {{ field: "value"|"category"|"from"|"to", kind: "missing"|"bad", message: string }} UnitProblem
 * @typedef {{ ok: true, category: string, from: string, to: string, answer: string, fromName: string, toName: string, fromShort: string, toShort: string }} UnitResult
 */

/**
 * Convert a typed number between two units.
 * @param {{ category?: string, from?: string, to?: string, value?: string }} input
 * @returns {UnitResult | { ok: false, problems: UnitProblem[] }}
 */
export function convertUnit(input) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  /** @type {UnitProblem[]} */
  const problems = [];
  const add_ = (field, kind, message) => problems.push({ field, kind, message });

  const cat = typeof src.category === "string" && Object.hasOwn(CATEGORIES, src.category) ? CATEGORIES[src.category] : null;
  if (!cat) add_("category", "bad", MESSAGES.categoryBad);
  const find = (id) => (cat && typeof id === "string" ? cat.units.find((u) => u.id === id) : undefined);
  const from = find(src.from);
  const to = find(src.to);
  if (cat && !from) add_("from", "bad", MESSAGES.fromBad);
  if (cat && !to) add_("to", "bad", MESSAGES.toBad);

  let value = null;
  if (isBlank(src.value)) add_("value", "missing", MESSAGES.valueMissing);
  else {
    const p = parseDecimal(src.value);
    if (p === null) add_("value", "bad", MESSAGES.valueBad);
    else if (p === "big") add_("value", "bad", MESSAGES.valueBig);
    else if (p.neg && src.category !== "temperature") add_("value", "bad", MESSAGES.valueNegative);
    else value = { n: p.neg ? -p.n : p.n, d: p.d };
  }
  if (problems.length > 0 || !cat || !from || !to || !value) return { ok: false, problems };

  let out;
  if (src.category === "temperature") {
    const k = toKelvin(from.id, value);
    if (k.n < 0n) return { ok: false, problems: [{ field: "value", kind: "bad", message: MESSAGES.valueCold }] };
    out = fromKelvin(to.id, k);
  } else {
    out = div(mul(value, frac(from.n, from.d)), frac(to.n, to.d));
  }
  const neg = out.n < 0n;
  const text = formatSignificant(neg ? -out.n : out.n, out.d);
  return {
    ok: true,
    category: src.category,
    from: from.id,
    to: to.id,
    answer: neg && text !== "0" ? `-${text}` : text,
    fromName: from.name,
    toName: to.name,
    fromShort: from.short,
    toShort: to.short,
  };
}
