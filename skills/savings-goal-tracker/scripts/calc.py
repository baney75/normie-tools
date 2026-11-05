#!/usr/bin/env python3
"""Savings Goal Tracker math. Standard library only. No network use.

Usage:
  python3 calc.py '{"mode":"when","goal":"5,000","saved":"500","monthly":"250","rate":"0","start":"2026-12"}'
  python3 calc.py --file input.json

mode "when": months to reach the goal, and the month it lands if a start month (YYYY-MM) is given.
mode "by": the monthly amount needed to reach the goal by a goal month (needs start and target).

Prints one JSON object. Money is whole cents, rates are basis points. On bad input it holds
{"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/savings-goal-tracker/calc.mjs. Both must give the same answers
(tests/golden.json). Each month: interest = balance * bps / 120000 rounded half up, then the
monthly amount is added. Month 1 is the start month. This is an estimate, not advice.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_AMOUNT_CENTS = 100_000_000_000  # $1,000,000,000
MAX_RATE_BPS = 10000  # 100%
MAX_MONTHS = 1200  # 100 years
D = 120000  # monthly rate = bps / 120000

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")
MONTH_RE = re.compile(r"^([0-9]{4})-([0-9]{2})$")

MESSAGES = {
    "goalMissing": "Type your goal amount.",
    "goalBad": "Goal amount: use a number above zero, like 5,000.",
    "goalBig": "Goal amount: that is too big for this tool. Use $1,000,000,000 or less.",
    "savedBad": "Already saved: use a dollar amount like 800, or leave it empty.",
    "monthlyMissing": "Type how much you save each month. Type 0 if none.",
    "monthlyBad": "Saved each month: use a dollar amount like 200.",
    "rateBad": "Yearly interest rate: use a percent from 0 to 100, like 4.5. Use two decimals at most. Or leave it empty.",
    "startBad": "Start month: type the year, a dash, then the month, like 2026-12.",
    "startMissing": "Type the month you start saving, like 2026-12.",
    "targetMissing": "Type the month you want to reach your goal, like 2028-06.",
    "targetBad": "Goal month: type the year, a dash, then the month, like 2028-06.",
    "targetEarly": "Goal month: pick the start month or a later month.",
    "targetFar": "Goal month: that is more than 1,200 months away. Pick a nearer month.",
    "tooBig": "These numbers are too big to work out. Try smaller ones.",
}


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


def _split(text, dollar, percent):
    s = _clean(text)
    if s == "":
        return None
    neg = False
    if s.startswith("-"):
        neg = True
        s = s[1:].strip()
    if dollar and s.startswith("$"):
        s = s[1:].strip()
    if percent and s.endswith("%"):
        s = s[:-1].strip()
    m = NUMBER_RE.match(s)
    if not m:
        return None
    whole = (m.group(1) or "").replace(",", "")
    frac = m.group(2) or ""
    if whole == "" and frac == "":
        return None
    return neg, (whole or "0"), frac


def _hundredths(text, dollar, percent):
    p = _split(text, dollar, percent)
    if p is None:
        return None
    neg, whole, frac = p
    frac = frac.rstrip("0")
    if len(frac) > 2:
        return None
    return int(whole) * 100 + int((frac + "00")[:2]), neg


def parse_money(text):
    """Typed money -> integer cents, or None."""
    r = _hundredths(text, True, False)
    if r is None:
        return None
    n, neg = r
    if n > MAX_SAFE:
        return None
    return -n if neg and n else n


def parse_rate(text):
    """Typed percent -> basis points, or None."""
    r = _hundredths(text, False, True)
    if r is None:
        return None
    n, neg = r
    if n > 100000000:
        return None
    return -n if neg and n else n


def parse_month(text):
    """'YYYY-MM' -> (year, month), or None. Year 1900 to 2200."""
    if not isinstance(text, str):
        return None
    m = MONTH_RE.match(text.strip())
    if not m:
        return None
    year, month = int(m.group(1)), int(m.group(2))
    if year < 1900 or year > 2200 or month < 1 or month > 12:
        return None
    return year, month


def month_index(p):
    return p[0] * 12 + p[1] - 1


def month_text(index):
    return "%04d-%02d" % (index // 12, index % 12 + 1)


def _blank(v):
    return v is None or (isinstance(v, str) and v.strip() == "") or (not isinstance(v, str) and _clean(v) == "")


def read_savings_input(inp):
    src = inp if isinstance(inp, dict) else {}
    mode = "by" if src.get("mode") == "by" else "when"
    problems = []

    def add(field, kind, key):
        problems.append({"field": field, "kind": kind, "message": MESSAGES[key]})

    goal = saved = monthly = rate = months = 0
    if _blank(src.get("goal")):
        add("goal", "missing", "goalMissing")
    else:
        v = parse_money(src.get("goal"))
        if v is None or v <= 0:
            add("goal", "bad", "goalBad")
        elif v > MAX_AMOUNT_CENTS:
            add("goal", "bad", "goalBig")
        else:
            goal = v
    if not _blank(src.get("saved")):
        v = parse_money(src.get("saved"))
        if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
            add("saved", "bad", "savedBad")
        else:
            saved = v
    if mode == "when":
        if _blank(src.get("monthly")):
            add("monthly", "missing", "monthlyMissing")
        else:
            v = parse_money(src.get("monthly"))
            if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
                add("monthly", "bad", "monthlyBad")
            else:
                monthly = v
    if not _blank(src.get("rate")):
        v = parse_rate(src.get("rate"))
        if v is None or v < 0 or v > MAX_RATE_BPS:
            add("rate", "bad", "rateBad")
        else:
            rate = v
    start = None
    if _blank(src.get("start")):
        if mode == "by":
            add("start", "missing", "startMissing")
    else:
        start = parse_month(src.get("start"))
        if start is None:
            add("start", "bad", "startBad")
    if mode == "by":
        if _blank(src.get("target")):
            add("target", "missing", "targetMissing")
        else:
            t = parse_month(src.get("target"))
            if t is None:
                add("target", "bad", "targetBad")
            elif start is not None:
                months = month_index(t) - month_index(start) + 1
                if months < 1:
                    add("target", "bad", "targetEarly")
                elif months > MAX_MONTHS:
                    add("target", "bad", "targetFar")
    if problems:
        return {"ok": False, "problems": problems}
    return {"ok": True, "mode": mode, "goalCents": goal, "savedCents": saved, "monthlyCents": monthly,
            "rateBps": rate, "start": start, "months": months}


def _step(balance, deposit, bps):
    interest = div_round_half_up(balance * bps, D)
    return interest, balance + interest + deposit


def _group_by_year(rows):
    out = []
    for s in range(0, len(rows), 12):
        ch = rows[s:s + 12]
        out.append({"year": s // 12 + 1, "depositsCents": sum(r[1] for r in ch),
                    "interestCents": sum(r[0] for r in ch), "balanceCents": ch[-1][2]})
    return out


def _when(v):
    start = month_text(month_index(v["start"])) if v["start"] else ""
    base = {"ok": True, "mode": "when", "goalCents": v["goalCents"], "savedCents": v["savedCents"],
            "monthlyCents": v["monthlyCents"], "rateBps": v["rateBps"], "start": start}
    flat = {"months": None, "landing": None, "depositsCents": 0, "interestEarnedCents": 0, "byYear": []}
    if v["savedCents"] >= v["goalCents"]:
        return dict(base, status="reached", finalBalanceCents=v["savedCents"], **dict(flat, months=0))
    if v["monthlyCents"] == 0 and v["rateBps"] == 0:
        return dict(base, status="no-savings", finalBalanceCents=v["savedCents"], **flat)
    balance = v["savedCents"]
    rows = []
    reached = False
    for _ in range(MAX_MONTHS):
        interest, balance = _step(balance, v["monthlyCents"], v["rateBps"])
        rows.append((interest, v["monthlyCents"], balance))
        if balance >= v["goalCents"]:
            reached = True
            break
    if balance > MAX_SAFE:
        return None
    n = len(rows)
    deposits = v["monthlyCents"] * n
    earned = balance - v["savedCents"] - deposits
    if not reached:
        return dict(base, status="too-long", finalBalanceCents=balance,
                    **dict(flat, depositsCents=deposits, interestEarnedCents=earned))
    landing = month_text(month_index(v["start"]) + n - 1) if v["start"] else None
    return dict(base, status="will-reach", months=n, landing=landing, finalBalanceCents=balance,
                depositsCents=deposits, interestEarnedCents=earned, byYear=_group_by_year(rows))


def _reaches(saved, monthly, bps, goal, months):
    balance = saved
    for _ in range(months):
        _i, balance = _step(balance, monthly, bps)
        if balance >= goal:
            return True
    return False


def _by(v):
    first = month_index(v["start"])
    base = {"ok": True, "mode": "by", "goalCents": v["goalCents"], "savedCents": v["savedCents"],
            "rateBps": v["rateBps"], "start": month_text(first), "months": v["months"],
            "target": month_text(first + v["months"] - 1)}
    if v["savedCents"] >= v["goalCents"]:
        return dict(base, status="reached", monthlyNeededCents=0, finalBalanceCents=v["savedCents"],
                    depositsCents=0, interestEarnedCents=0)
    lo, hi = 0, v["goalCents"]
    while lo < hi:
        mid = (lo + hi) // 2
        if _reaches(v["savedCents"], mid, v["rateBps"], v["goalCents"], v["months"]):
            hi = mid
        else:
            lo = mid + 1
    balance = v["savedCents"]
    for _ in range(v["months"]):
        _i, balance = _step(balance, lo, v["rateBps"])
    if balance > MAX_SAFE:
        return None
    deposits = lo * v["months"]
    return dict(base, status="needs", monthlyNeededCents=lo, finalBalanceCents=balance,
                depositsCents=deposits, interestEarnedCents=balance - v["savedCents"] - deposits)


def explain_savings(inp):
    read = read_savings_input(inp)
    if not read["ok"]:
        return read
    result = _by(read) if read["mode"] == "by" else _when(read)
    if result is None:
        return {"ok": False, "problems": [{"field": "goal", "kind": "bad", "message": MESSAGES["tooBig"]}]}
    return result


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
        print(json.dumps({"ok": False, "problems": [{"field": "goal", "kind": "bad",
              "message": "The input was not readable. Send the numbers as JSON."}]}))
        return 1
    result = explain_savings(data)
    print(json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
