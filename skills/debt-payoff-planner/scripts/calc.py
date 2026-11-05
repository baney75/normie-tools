#!/usr/bin/env python3
"""Debt Payoff Planner math. Standard library only. No network use.

Usage:
  python3 calc.py '{"debts":[{"name":"Card","balance":"2,500","rate":"22.99","minimum":"60"}],"extra":"100"}'
  python3 calc.py --file input.json

Prints one JSON object. On good input it holds both plans (money in whole cents, rates in
basis points). On bad input it holds {"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/debt-payoff-planner/calc.mjs. Both must give the same answers
(tests/golden.json). Rounding is half up to the cent at ONE step: each month, each open debt,
interest = balance * rate / 12. Each month: add interest, pay every open debt its smallest
payment, then give the rest of the month's money to the first open debt in the plan's line.
The month's money is every starting smallest payment added up, plus the extra, so a cleared
debt's smallest payment rolls to the next debt. Snowball line: smallest starting balance first.
Avalanche line: highest rate first. A tie goes to the debt typed first. Stops at 1,200 months.
This is an estimate from typed numbers. It is not advice.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_AMOUNT_CENTS = 100_000_000_000  # $1,000,000,000
MAX_RATE_BPS = 10000  # 100%
MAX_MONTHS = 1200  # 100 years
MAX_DEBTS = 6
D = 120000  # monthly rate = bps / 120000

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")


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
    n = int(whole) * 100 + int((frac + "00")[:2])
    return n, neg


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


def format_money(cents):
    neg = cents < 0
    a = -cents if neg else cents
    return "%s$%s.%02d" % ("-" if neg else "", format(a // 100, ","), a % 100)


def month_interest(balance_cents, rate_bps):
    """balance * bps / 12 months, rounded half up to the cent."""
    return div_round_half_up(balance_cents * rate_bps, D)


def _msg_no_debts():
    return "Type at least one debt: its balance, yearly interest rate and smallest monthly payment."


def _msg_too_many():
    return "This tool takes up to %d debts. Take some out to see an answer." % MAX_DEBTS


def _blank(v):
    return v is None or (isinstance(v, str) and v.strip() == "")


def _clean_name(text):
    if not isinstance(text, str):
        return ""
    s = CONTROL_RE.sub(" ", text).strip()
    return s[:40].strip()


def read_planner_input(inp):
    src = inp if isinstance(inp, dict) else {}
    rows = src.get("debts")
    rows = rows if isinstance(rows, list) else []
    problems = []

    def add(field, kind, message):
        problems.append({"field": field, "kind": kind, "message": message})

    used = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        if all(_blank(row.get(k)) for k in ("name", "balance", "rate", "minimum")):
            continue
        used.append((row, i + 1))

    debts = []
    if not used:
        add("debts", "missing", _msg_no_debts())
    elif len(used) > MAX_DEBTS:
        add("debts", "bad", _msg_too_many())
    else:
        for row, r in used:
            label = "Debt %d" % r
            balance = 0
            if _blank(row.get("balance")):
                add("balance%d" % r, "missing", "%s: type the balance." % label)
            else:
                v = parse_money(row.get("balance"))
                if v is None or v <= 0:
                    add("balance%d" % r, "bad", "%s balance: use a number above zero, like 2,500." % label)
                elif v > MAX_AMOUNT_CENTS:
                    add("balance%d" % r, "bad", "%s balance: that is too big for this tool. Use $1,000,000,000 or less." % label)
                else:
                    balance = v
            rate = 0
            if _blank(row.get("rate")):
                add("rate%d" % r, "missing", "%s: type the yearly interest rate. Type 0 if there is none." % label)
            else:
                v = parse_rate(row.get("rate"))
                if v is None or v < 0 or v > MAX_RATE_BPS:
                    add("rate%d" % r, "bad", "%s interest rate: use a percent from 0 to 100, like 19.99. Use two decimals at most." % label)
                else:
                    rate = v
            minimum = 0
            if _blank(row.get("minimum")):
                add("minimum%d" % r, "missing", "%s: type the smallest payment due each month." % label)
            else:
                v = parse_money(row.get("minimum"))
                if v is None or v <= 0:
                    add("minimum%d" % r, "bad", "%s smallest payment: use a number above zero, like 35." % label)
                elif v > MAX_AMOUNT_CENTS:
                    add("minimum%d" % r, "bad", "%s smallest payment: that is too big for this tool. Use $1,000,000,000 or less." % label)
                else:
                    minimum = v
            debts.append({"name": _clean_name(row.get("name")) or label, "balanceCents": balance,
                          "rateBps": rate, "minimumCents": minimum, "row": r})

    extra = 0
    if not _blank(src.get("extra")):
        v = parse_money(src.get("extra"))
        if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
            add("extra", "bad", "Extra each month: use a dollar amount like 50, or leave it empty.")
        else:
            extra = v

    if not problems:
        for d in debts:
            interest = month_interest(d["balanceCents"], d["rateBps"])
            if interest >= d["minimumCents"]:
                add("minimum%d" % d["row"], "bad",
                    "Debt %d: the smallest payment (%s) does not cover the first month's interest (%s). "
                    "Paying only that never lowers this debt, so no payoff date can be worked out."
                    % (d["row"], format_money(d["minimumCents"]), format_money(interest)))
    if problems:
        return {"ok": False, "problems": problems}
    clean = [{k: v for k, v in d.items() if k != "row"} for d in debts]
    return {"ok": True, "debts": clean, "extraCents": extra}


def run_plan(debts, extra, line):
    """One plan, month by month. Returns the plan, or None if not clear in 1,200 months."""
    bal = [d["balanceCents"] for d in debts]
    done = [0] * len(debts)
    monthly = sum(d["minimumCents"] for d in debts) + extra
    total_interest = 0
    total_paid = 0
    month = 0
    while any(b > 0 for b in bal):
        if month >= MAX_MONTHS:
            return None
        month += 1
        left = monthly
        for i, d in enumerate(debts):
            if bal[i] > 0:
                it = month_interest(bal[i], d["rateBps"])
                bal[i] += it
                total_interest += it
        for i, d in enumerate(debts):
            if bal[i] > 0:
                pay = min(d["minimumCents"], bal[i])
                bal[i] -= pay
                left -= pay
        for i in line:
            if left <= 0:
                break
            if bal[i] <= 0:
                continue
            pay = min(left, bal[i])
            bal[i] -= pay
            left -= pay
        total_paid += monthly - left
        for i in range(len(debts)):
            if bal[i] == 0 and done[i] == 0:
                done[i] = month
    seq = sorted(range(len(debts)), key=lambda i: (done[i], line.index(i)))
    return {"months": month, "totalInterestCents": total_interest, "totalPaidCents": total_paid,
            "order": [{"name": debts[i]["name"], "month": done[i]} for i in seq]}


def _line_by(debts, key):
    return sorted(range(len(debts)), key=lambda i: (key(debts[i]), i))


def calc_plans(debts, extra):
    snow = run_plan(debts, extra, _line_by(debts, lambda d: d["balanceCents"]))
    aval = run_plan(debts, extra, _line_by(debts, lambda d: -d["rateBps"]))
    if snow is None or aval is None:
        return None
    ma = snow["months"] - aval["months"]
    ia = snow["totalInterestCents"] - aval["totalInterestCents"]
    return {
        "ok": True,
        "debts": debts,
        "extraCents": extra,
        "totalBalanceCents": sum(d["balanceCents"] for d in debts),
        "monthlyMoneyCents": sum(d["minimumCents"] for d in debts) + extra,
        "snowball": snow,
        "avalanche": aval,
        "difference": {
            "monthsApart": abs(ma),
            "fewerMonths": "same" if ma == 0 else ("avalanche" if ma > 0 else "snowball"),
            "interestApartCents": abs(ia),
            "lessInterest": "same" if ia == 0 else ("avalanche" if ia > 0 else "snowball"),
        },
    }


def plan_debt_payoff(inp):
    read = read_planner_input(inp)
    if not read["ok"]:
        return read
    result = calc_plans(read["debts"], read["extraCents"])
    if result is None:
        return {"ok": False, "problems": [{"field": "debts", "kind": "bad", "message":
                "At these numbers a debt would take more than 1,200 months (100 years) to pay off, "
                "so this tool stops here. Check the numbers."}]}
    return result


def main(argv):
    try:
        if len(argv) >= 3 and argv[1] == "--file":
            with open(argv[2], encoding="utf-8") as f:
                data = json.load(f)
        elif len(argv) >= 2:
            data = json.loads(argv[1])
        else:
            print(__doc__)
            return 1
    except (OSError, ValueError) as e:
        print(json.dumps({"ok": False, "problems": [{"field": "input", "kind": "bad",
              "message": "I could not read the input file. Check that it is plain JSON."}]}))
        sys.stderr.write("input error: %s\n" % e)
        return 1
    result = plan_debt_payoff(data)
    print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
