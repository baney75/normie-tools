#!/usr/bin/env python3
"""Save Me Money math. Standard library only. No network use.

Usage:
  python3 calc.py '{"items":[{"name":"Phone","amount":"65","every":"month"}]}'
  python3 calc.py --file input.json

Add --text before the input to print plain words instead of JSON:
  python3 calc.py --text --file input.json

Prints one JSON object. On good input it holds each cost as a yearly and a monthly figure (money in
whole cents), biggest yearly cost first, plus totals. On bad input it holds {"ok": false, "problems": [...]}.

This is a Python copy of tools/save-me-money/calc.mjs and tools/_shared/money.mjs.
Both must give the same answers (tests/golden.json).
  week:  yearly = amount * 52 (a year is taken as 52 weeks; an estimate)
  month: yearly = amount * 12
  year:  yearly = amount
  monthly figure of each line = yearly / 12, rounded half up to the cent, once per line.
Totals are sums of the line figures. Blank and zero lines are left out.
This counts typed numbers. It is not advice.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_AMOUNT_CENTS = 100_000_000_000  # $1,000,000,000 per line
MAX_ROWS = 40
MAX_NAME = 60
EVERY = ("week", "month", "year")
PER_YEAR = {"week": 52, "month": 12, "year": 1}

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")

QUESTIONS = [
    "What is the price today?",
    "What did it cost a year ago?",
    "Is there a cheaper plan with the same things in it?",
    "Can I stop this with no fee?",
    "When does my current deal end?",
]


def bad_msg(label):
    return f"{label}: use a dollar amount like 12.50, or leave it empty."


def negative_msg(label):
    return f"{label}: use zero or more. A minus sign does not work here."


def big_msg(label):
    return f"{label}: that is too big for this tool. Use $1,000,000,000 or less."


def every_msg(label):
    return f"{label}: pick week, month or year for how often."


def div_round_half_up(num, den):
    """num / den rounded half up. den > 0."""
    if den <= 0:
        raise ValueError("den must be positive")
    neg = num < 0
    n = -num if neg else num
    q = (2 * n + den) // (2 * den)
    return -q if neg else q


def _clean(text):
    if isinstance(text, bool):
        return ""
    if isinstance(text, (int, float)):
        try:
            return str(text) if text == text and text not in (float("inf"), float("-inf")) else ""
        except Exception:
            return ""
    return text.strip() if isinstance(text, str) else ""


def parse_money(text):
    """Typed money -> integer cents, or None. A leading minus is kept."""
    s = _clean(text)
    if s == "":
        return None
    neg = False
    if s.startswith("-"):
        neg = True
        s = s[1:].strip()
    if s.startswith("$"):
        s = s[1:].strip()
    m = NUMBER_RE.match(s)
    if not m:
        return None
    whole = (m.group(1) or "").replace(",", "")
    frac = m.group(2) or ""
    if whole == "" and frac == "":
        return None
    frac = frac.rstrip("0")
    if len(frac) > 2:
        return None
    n = int(whole or "0") * 100 + int((frac + "00")[:2])
    if n > MAX_SAFE:
        return None
    return -n if neg and n else n


def format_money(cents):
    neg = cents < 0
    a = -cents if neg else cents
    return f"{'-' if neg else ''}${a // 100:,}.{a % 100:02d}"


def _is_blank(t):
    if t is None:
        return True
    if isinstance(t, str):
        return t.strip() == ""
    return False


def list_costs(data):
    src = data if isinstance(data, dict) else {}
    items = src.get("items")
    if not isinstance(items, list):
        return {"ok": False, "problems": [{"field": "items", "kind": "missing", "message": "The list of costs is missing."}]}
    if len(items) > MAX_ROWS:
        return {"ok": False, "problems": [{"field": "items", "kind": "bad", "message": "Too many lines. Use 40 or fewer."}]}
    problems = []
    rows = []
    for i, line in enumerate(items):
        row = line if isinstance(line, dict) else {}
        raw = row.get("name")
        raw = raw.strip() if isinstance(raw, str) else ""
        label = raw[:MAX_NAME] or f"Cost {i + 1}"
        amount = row.get("amount")
        if _is_blank(amount):
            continue
        cents = parse_money(amount)
        field = f"items.{i}"
        if cents is None:
            problems.append({"field": field, "kind": "bad", "message": bad_msg(label)})
            continue
        if cents < 0:
            problems.append({"field": field, "kind": "bad", "message": negative_msg(label)})
            continue
        if cents > MAX_AMOUNT_CENTS:
            problems.append({"field": field, "kind": "bad", "message": big_msg(label)})
            continue
        every = row.get("every")
        every = every.strip().lower() if isinstance(every, str) else ""
        if every not in EVERY:
            problems.append({"field": field, "kind": "bad", "message": every_msg(label)})
            continue
        if cents == 0:
            continue
        yearly = cents * PER_YEAR[every]
        rows.append({"index": i, "name": label, "amountCents": cents, "every": every,
                     "yearlyCents": yearly, "monthlyCents": div_round_half_up(yearly, 12)})
    if problems:
        return {"ok": False, "problems": problems}
    rows.sort(key=lambda r: (-r["yearlyCents"], r["index"]))
    return {
        "ok": True,
        "hasAmounts": len(rows) > 0,
        "count": len(rows),
        "yearlyCents": sum(r["yearlyCents"] for r in rows),
        "monthlyCents": sum(r["monthlyCents"] for r in rows),
        "rows": rows,
    }


NOTE = ("Note: this only adds up what was typed. Weekly costs use 52 weeks, so they are estimates. "
        "It never calls, cancels or pays anything.")


def dollars(cents):
    """Whole dollars and cents with a comma: 123456 -> 1,234.56 (no raw cents shown)."""
    return format_money(cents)


def to_text(result):
    """Plain words, one fact per line, a final note line. Problems come first as 'Fix this first:' lines."""
    lines = []
    if not result.get("ok"):
        for p in result["problems"]:
            lines.append(f"Fix this first: {p['message']}")
        lines.append(NOTE)
        return "\n".join(lines)
    if not result["hasAmounts"]:
        lines.append("Nothing to add up yet. Type an amount on at least one line.")
        lines.append(NOTE)
        return "\n".join(lines)
    lines.append(f"Total per year: {dollars(result['yearlyCents'])}")
    lines.append(f"Total per month: {dollars(result['monthlyCents'])}")
    lines.append(f"Number of costs: {result['count']}")
    for n, r in enumerate(result["rows"], 1):
        lines.append(f"{n}. {r['name']}: {dollars(r['yearlyCents'])} a year, {dollars(r['monthlyCents'])} a month")
    lines.append("Questions to ask before you call:")
    for q in QUESTIONS:
        lines.append(q)
    lines.append(NOTE)
    return "\n".join(lines)


def main(argv):
    as_text = "--text" in argv
    argv = [a for a in argv if a != "--text"]
    if len(argv) >= 2 and argv[0] == "--file":
        with open(argv[1], encoding="utf-8") as f:
            raw = f.read()
    elif argv:
        raw = argv[0]
    else:
        print(__doc__)
        return 2
    try:
        data = json.loads(raw)
    except ValueError:
        bad = {"ok": False, "problems": [{"field": "items", "kind": "bad",
               "message": "The input was not readable. Send the costs as JSON."}]}
        print(to_text(bad) if as_text else json.dumps(bad))
        return 1
    result = list_costs(data)
    if as_text:
        print(to_text(result))
        return 0 if result["ok"] else 1
    if result["ok"]:
        result["questions"] = QUESTIONS
    print(json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
