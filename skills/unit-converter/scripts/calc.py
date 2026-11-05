#!/usr/bin/env python3
"""Unit Converter math. Standard library only. No network use.

Usage:
  python3 calc.py '{"category":"length","from":"inch","to":"millimeter","value":"12"}'
  python3 calc.py --file input.json
  python3 calc.py --file input.json --text    (same answer in plain words)

Prints one JSON object. On good input it holds the answer as text, rounded half up to 6
significant digits. On bad input it holds {"ok": false, "problems": [...]} with plain-words
messages.

This is a Python copy of tools/unit-converter/calc.mjs. Both must give the same answers
(tests/golden.json). All math is exact fractions of whole numbers. The only rounding is the
last step. There is no money here, so there are no cents.

Definitions (international, exact): 1 inch = 25.4 mm, 1 foot = 12 inches, 1 yard = 3 feet,
1 mile = 5280 feet, 1 pound = 0.45359237 kg, 1 ounce = 1/16 pound, 1 US gallon = 3.785411784 L
(quart 1/4, pint 1/8, cup 1/16, fluid ounce 1/128, tablespoon 1/256, teaspoon 1/768 of it),
0 degrees C = 273.15 K, F = C * 9/5 + 32, 1 mph = 1609.344 m per 3600 s.
"""
import json
import re
import sys
from math import gcd

MAX_WHOLE_DIGITS = 12
MAX_FRACTION_DIGITS = 9
SIG_DIGITS = 6


def _u(uid, name, short, n, d):
    return {"id": uid, "name": name, "short": short, "n": n, "d": d}


CATEGORIES = {
    "length": [
        _u("inch", "inches", "in", 254, 10000),
        _u("foot", "feet", "ft", 3048, 10000),
        _u("yard", "yards", "yd", 9144, 10000),
        _u("mile", "miles", "mi", 1609344, 1000),
        _u("millimeter", "millimeters", "mm", 1, 1000),
        _u("centimeter", "centimeters", "cm", 1, 100),
        _u("meter", "meters", "m", 1, 1),
        _u("kilometer", "kilometers", "km", 1000, 1),
    ],
    "weight": [
        _u("ounce", "ounces", "oz", 45359237, 1600000000),
        _u("pound", "pounds", "lb", 45359237, 100000000),
        _u("gram", "grams", "g", 1, 1000),
        _u("kilogram", "kilograms", "kg", 1, 1),
    ],
    "volume": [
        _u("teaspoon", "teaspoons", "tsp", 3785411784, 768000000000),
        _u("tablespoon", "tablespoons", "tbsp", 3785411784, 256000000000),
        _u("fluid-ounce", "US fluid ounces", "fl oz", 3785411784, 128000000000),
        _u("cup", "US cups", "cup", 3785411784, 16000000000),
        _u("pint", "US pints", "pt", 3785411784, 8000000000),
        _u("quart", "US quarts", "qt", 3785411784, 4000000000),
        _u("gallon", "US gallons", "gal", 3785411784, 1000000000),
        _u("milliliter", "milliliters", "mL", 1, 1000),
        _u("liter", "liters", "L", 1, 1),
    ],
    "temperature": [
        {"id": "fahrenheit", "name": "degrees Fahrenheit", "short": "°F"},
        {"id": "celsius", "name": "degrees Celsius", "short": "°C"},
        {"id": "kelvin", "name": "kelvins", "short": "K"},
    ],
    "speed": [
        _u("mph", "miles per hour", "mph", 1609344, 3600000),
        _u("kmh", "kilometers per hour", "km/h", 1000, 3600),
    ],
}

MESSAGES = {
    "valueMissing": "Type the number you want to change.",
    "valueBad": "Number: use digits like 12 or 3.5. Leave out letters and extra signs.",
    "valueNegative": "Number: use zero or more for this kind of unit.",
    "valueCold": "Number: that is colder than anything can be. Type a warmer number.",
    "valueBig": "Number: that is too big for this tool. Use fewer than 13 digits before the dot.",
    "categoryBad": "Kind: pick one from the list.",
    "fromBad": "Change from: pick a unit from the list.",
    "toBad": "Change to: pick a unit from the list.",
}

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")


def div_round_half_up(num, den):
    """num / den rounded half up (half away from zero for negatives). den > 0."""
    if den <= 0:
        raise ValueError("den must be positive")
    neg = num < 0
    n = -num if neg else num
    q = (2 * n + den) // (2 * den)
    return -q if neg else q


def _text(value):
    """The typed value as text, or None when it is not text or a plain number."""
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (value != value or value in (float("inf"), float("-inf"))):
            return ""
        return str(value)
    return None


def parse_decimal(text):
    """Exact fraction from typed text: (neg, n, d), the string 'big', or None."""
    s = _text(text)
    if s is None:
        return None
    s = s.strip()
    neg = False
    if s.startswith("-"):
        neg = True
        s = s[1:].strip()
    m = NUMBER_RE.match(s)
    if not m:
        return None
    whole = (m.group(1) or "").replace(",", "")
    raw_frac = m.group(2) or ""
    if whole == "" and raw_frac == "":
        return None
    frac = raw_frac.rstrip("0")
    w = whole.lstrip("0")
    if len(w) > MAX_WHOLE_DIGITS or len(frac) > MAX_FRACTION_DIGITS:
        return "big"
    n = int((w or "0") + frac)
    return (neg and n != 0, n, 10 ** len(frac))


def _frac(n, d):
    g = gcd(n, d) or 1
    return (n // g, d // g)


def _add(a, b):
    return _frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1])


def _sub(a, b):
    return _frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1])


def _mul(a, b):
    return _frac(a[0] * b[0], a[1] * b[1])


def _div(a, b):
    return _frac(a[0] * b[1], a[1] * b[0])


K0 = _frac(27315, 100)
F32 = (32, 1)


def _to_kelvin(uid, v):
    if uid == "kelvin":
        return v
    if uid == "celsius":
        return _add(v, K0)
    return _add(_mul(_sub(v, F32), (5, 9)), K0)


def _from_kelvin(uid, k):
    if uid == "kelvin":
        return k
    c = _sub(k, K0)
    if uid == "celsius":
        return c
    return _add(_mul(c, (9, 5)), F32)


def format_significant(n, d):
    """Round the positive fraction n/d to 6 significant digits, half up, as plain digits."""
    if n == 0:
        return "0"

    def at_least(e):
        return n >= d * 10 ** e if e >= 0 else n * 10 ** (-e) >= d

    e = len(str(n)) - len(str(d))
    while not at_least(e):
        e -= 1
    while at_least(e + 1):
        e += 1
    k = SIG_DIGITS - 1 - e
    q = div_round_half_up(n * 10 ** k, d) if k >= 0 else div_round_half_up(n, d * 10 ** (-k))
    if q == 10 ** SIG_DIGITS:
        q = 10 ** (SIG_DIGITS - 1)
        e += 1
    s = str(q)
    if e >= SIG_DIGITS - 1:
        whole, fraction = s + "0" * (e - (SIG_DIGITS - 1)), ""
    elif e >= 0:
        whole, fraction = s[: e + 1], s[e + 1:].rstrip("0")
    else:
        whole, fraction = "0", ("0" * (-e - 1) + s).rstrip("0")
    whole = f"{int(whole):,}"
    return f"{whole}.{fraction}" if fraction else whole


def _blank(v):
    if v is None:
        return True
    if isinstance(v, (str, int, float)) and not isinstance(v, bool):
        return str(v).strip() == ""
    return isinstance(v, list) and len(v) == 0


def convert_unit(inp):
    src = inp if isinstance(inp, dict) else {}
    problems = []

    def add(field, kind, key):
        problems.append({"field": field, "kind": kind, "message": MESSAGES[key]})

    cid = src.get("category")
    units = CATEGORIES.get(cid) if isinstance(cid, str) else None
    if units is None:
        add("category", "bad", "categoryBad")

    def find(uid):
        if units is None or not isinstance(uid, str):
            return None
        for u in units:
            if u["id"] == uid:
                return u
        return None

    frm, to = find(src.get("from")), find(src.get("to"))
    if units is not None and frm is None:
        add("from", "bad", "fromBad")
    if units is not None and to is None:
        add("to", "bad", "toBad")

    value = None
    raw = src.get("value")
    if _blank(raw):
        add("value", "missing", "valueMissing")
    else:
        p = parse_decimal(raw)
        if p is None:
            add("value", "bad", "valueBad")
        elif p == "big":
            add("value", "bad", "valueBig")
        elif p[0] and cid != "temperature":
            add("value", "bad", "valueNegative")
        else:
            value = (-p[1] if p[0] else p[1], p[2])
    if problems or units is None or frm is None or to is None or value is None:
        return {"ok": False, "problems": problems}

    if cid == "temperature":
        k = _to_kelvin(frm["id"], value)
        if k[0] < 0:
            return {"ok": False, "problems": [{"field": "value", "kind": "bad", "message": MESSAGES["valueCold"]}]}
        out = _from_kelvin(to["id"], k)
    else:
        out = _div(_mul(value, _frac(frm["n"], frm["d"])), _frac(to["n"], to["d"]))
    neg = out[0] < 0
    text = format_significant(-out[0] if neg else out[0], out[1])
    return {
        "ok": True,
        "category": cid,
        "from": frm["id"],
        "to": to["id"],
        "answer": "-" + text if neg and text != "0" else text,
        "fromName": frm["name"],
        "toName": to["name"],
        "fromShort": frm["short"],
        "toShort": to["short"],
    }



ONE_NAMES = {
    "inch": "inch", "foot": "foot", "yard": "yard", "mile": "mile", "millimeter": "millimeter",
    "centimeter": "centimeter", "meter": "meter", "kilometer": "kilometer", "ounce": "ounce",
    "pound": "pound", "gram": "gram", "kilogram": "kilogram", "teaspoon": "teaspoon",
    "tablespoon": "tablespoon", "fluid-ounce": "US fluid ounce", "cup": "US cup", "pint": "US pint",
    "quart": "US quart", "gallon": "US gallon", "milliliter": "milliliter", "liter": "liter",
    "fahrenheit": "degree Fahrenheit", "celsius": "degree Celsius", "kelvin": "kelvin",
    "mph": "mile per hour", "kmh": "kilometer per hour",
}


def unit_text(result, inp):
    """The same answer as plain words, one short fact per line."""
    if not result.get("ok"):
        return ["Fix this first: %s" % q["message"] for q in result.get("problems", [])] or ["Fix this first: Something is wrong with the numbers."]
    typed = _text(inp.get("value") if isinstance(inp, dict) else None)
    typed = typed.strip() if typed else ""
    one = parse_decimal(typed) == (False, 1, 1)
    from_name = ONE_NAMES[result["from"]] if one else result["fromName"]
    return [
        "%s %s is %s %s." % (typed, from_name, result["answer"], result["toName"]),
        "Your answer: %s %s" % (result["answer"], result["toName"]),
        "Shown to 6 digits.",
        "Conversions use exact standard factors.",
    ]


def main(argv):
    args = [a for a in argv if a != "--text"]
    as_text = len(args) != len(argv)
    if len(args) >= 2 and args[0] == "--file":
        with open(args[1], encoding="utf-8") as f:
            raw = f.read()
    elif args:
        raw = args[0]
    else:
        print(__doc__)
        return 2
    try:
        data = json.loads(raw)
    except ValueError:
        unreadable = {"ok": False, "problems": [{"field": "value", "kind": "bad",
                      "message": "The input was not readable. Send the numbers as JSON."}]}
        print("\n".join(unit_text(unreadable, None)) if as_text else json.dumps(unreadable))
        return 1
    result = convert_unit(data)
    if as_text:
        print("\n".join(unit_text(result, data)))
        return 0 if result["ok"] else 1
    print(json.dumps(result, indent=1, ensure_ascii=False))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
