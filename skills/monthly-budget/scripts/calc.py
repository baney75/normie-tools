#!/usr/bin/env python3
"""Monthly Budget math. Standard library only. No network use.

Usage:
  python3 calc.py '{"income":[{"name":"Pay","amount":"3,000"}],"expenses":[{"name":"Rent","amount":"1,200"}]}'
  python3 calc.py --file input.json

Prints one JSON object. On good input it holds the totals, left over and percents (money in whole
cents). On bad input it holds {"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/monthly-budget/calc.mjs and tools/_shared/money.mjs.
Both must give the same answers (tests/golden.json). Totals are plain sums of cents.
Percents are whole numbers split by the largest remainder method so they add up exactly.
This is a count of typed numbers. It is not advice.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_AMOUNT_CENTS = 100_000_000_000  # $1,000,000,000 per line
MAX_ROWS = 40
MAX_NAME = 60

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")

MESSAGES = {
    "incomeMissing": "The income list is missing.",
    "expensesMissing": "The spending list is missing.",
    "tooMany": "Too many lines. Use 40 or fewer in each list.",
}


def bad_msg(label):
    return f"{label}: use a dollar amount like 1,200, or leave it empty."


def negative_msg(label):
    return f"{label}: use zero or more. A minus sign does not work here."


def big_msg(label):
    return f"{label}: that is too big for this tool. Use $1,000,000,000 or less."


def div_round_half_up(num, den):
    """num / den rounded half up (half away from zero for negatives). den > 0."""
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


def split_whole(values, whole, target):
    """Largest remainder: whole-number percents of `whole` that add up to `target`."""
    floors = [v * 100 // whole for v in values]
    rems = [v * 100 % whole for v in values]
    missing = target - sum(floors)
    order = sorted(range(len(values)), key=lambda i: (-rems[i], i))
    out = list(floors)
    for i in order:
        if missing <= 0:
            break
        out[i] += 1
        missing -= 1
    return out


def read_list(lst, key, fallback, problems):
    if not isinstance(lst, list):
        problems.append({"field": key, "kind": "missing",
                         "message": MESSAGES["incomeMissing"] if key == "income" else MESSAGES["expensesMissing"]})
        return []
    if len(lst) > MAX_ROWS:
        problems.append({"field": key, "kind": "bad", "message": MESSAGES["tooMany"]})
        return []
    rows = []
    for i, line in enumerate(lst):
        src = line if isinstance(line, dict) else {}
        raw = src.get("name")
        raw = raw.strip() if isinstance(raw, str) else ""
        name = raw[:MAX_NAME]
        label = name or f"{fallback} {i + 1}"
        cents = 0
        amount = src.get("amount")
        if not _is_blank(amount):
            v = parse_money(amount)
            if v is None:
                problems.append({"field": f"{key}.{i}", "kind": "bad", "message": bad_msg(label)})
            elif v < 0:
                problems.append({"field": f"{key}.{i}", "kind": "bad", "message": negative_msg(label)})
            elif v > MAX_AMOUNT_CENTS:
                problems.append({"field": f"{key}.{i}", "kind": "bad", "message": big_msg(label)})
            else:
                cents = v
        rows.append({"name": label, "cents": cents})
    return rows


def plan_budget(data):
    src = data if isinstance(data, dict) else {}
    problems = []
    income_rows = read_list(src.get("income"), "income", "Income line", problems)
    spend_rows = read_list(src.get("expenses"), "expenses", "Spending line", problems)
    if problems:
        return {"ok": False, "problems": problems}
    income = sum(r["cents"] for r in income_rows)
    spending = sum(r["cents"] for r in spend_rows)
    cents = [r["cents"] for r in spend_rows]
    of_income = split_whole(cents, income, div_round_half_up(spending * 100, income)) if income > 0 else None
    shares = split_whole(cents, spending, 100) if spending > 0 else None
    return {
        "ok": True,
        "hasAmounts": income > 0 or spending > 0,
        "incomeCents": income,
        "spendingCents": spending,
        "leftCents": income - spending,
        "overspent": spending > income,
        "spendingPercentOfIncome": sum(of_income) if of_income is not None else None,
        "incomeRows": income_rows,
        "expenseRows": [
            {"name": r["name"], "cents": r["cents"],
             "percentOfIncome": of_income[i] if of_income is not None else None,
             "shareOfSpending": shares[i] if shares is not None else None}
            for i, r in enumerate(spend_rows)
        ],
    }


def main(argv):
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
        print(json.dumps({"ok": False, "problems": [{"field": "income", "kind": "bad",
              "message": "The input was not readable. Send the numbers as JSON."}]}))
        return 1
    result = plan_budget(data)
    print(json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
