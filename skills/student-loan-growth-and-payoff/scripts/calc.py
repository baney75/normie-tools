#!/usr/bin/env python3
"""Student Loan Growth and Payoff math. Standard library only. No network use.

Usage:
  python3 calc.py '{"balance":"20,000","rate":"5","waitMonths":"6","capitalize":false,"payment":"300","start":"2026-09","years":"10"}'
  python3 calc.py --file input.json
  python3 calc.py --file input.json --text    (same answer in plain words and dollars)

Prints one JSON object. On good input it holds the answer (money in whole cents, rates in
basis points). On bad input it holds {"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/student-loan-growth-and-payoff/calc.mjs. Both must give the same
answers (tests/golden.json). This is an ESTIMATE: real loans add interest daily, here it is
approximated as monthly. Rounding is half up to the cent, only for each month's interest
(balance * rate / 12). Waiting interest is that one rounded month times the months waited.
Toggle off: unpaid interest stays apart and interest keeps being figured on the first balance.
Toggle on: unpaid interest is added to the balance when payments start.
The last payment is trued up. The minimum payment is the smallest whole-cent payment that
clears the loan in the chosen years. It is not advice.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_AMOUNT_CENTS = 100_000_000_000  # $1,000,000,000
MAX_RATE_BPS = 10000  # 100%
MAX_WAIT_MONTHS = 600
MAX_PAYOFF_MONTHS = 1200
MAX_YEARS = 100
MIN_START_YEAR = 2000
MAX_START_YEAR = 2200
D = 120000  # monthly rate = bps / 120000

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")
START_RE = re.compile(r"^([0-9]{4})-([0-9]{2})$")
MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]

MESSAGES = {
    "balanceMissing": "Type your loan balance.",
    "balanceBad": "Loan balance: use a number above zero, like 12,000.",
    "balanceBig": "Loan balance: that is too big for this tool. Use $1,000,000,000 or less.",
    "rateMissing": "Type the yearly interest rate. Type 0 if there is none.",
    "rateBad": "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
    "waitBad": "Months with no payments: use a whole number from 0 to 600, or leave it empty.",
    "paymentBad": "Monthly payment: use a dollar amount above zero, like 150, or leave it empty.",
    "paymentSmall": "Monthly payment: that is too small to pay off the loan in 100 years. Try a bigger payment.",
    "startBad": "Payments start: type the year, a dash, then the month, like 2026-09.",
    "yearsBad": "Years to pay off: use a whole number from 1 to 100, or leave it empty.",
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


def parse_whole_number(text):
    p = _split(text, False, False)
    if p is None:
        return None
    neg, whole, frac = p
    if neg or len(whole) > 15 or frac.strip("0") != "":
        return None
    return int(whole)


def month_interest(balance, bps):
    return div_round_half_up(balance * bps, D)


def run_schedule(principal, accrued, bps, pay, max_months, want_rows):
    """Run the payoff schedule. Returns (months, paid, rows) or None if not clear in max_months."""
    p, a, paid, month = principal, accrued, 0, 0
    rows = []
    while (p > 0 or a > 0) and month < max_months:
        month += 1
        a += month_interest(p, bps)
        due = a + p
        pmt = due if pay >= due else pay
        to_interest = pmt if pmt < a else a
        a -= to_interest
        p -= pmt - to_interest
        paid += pmt
        if want_rows:
            rows.append({"paymentCents": pmt, "interestCents": to_interest,
                         "principalCents": pmt - to_interest, "balanceCents": p + a})
    if p > 0 or a > 0:
        return None
    return month, paid, rows


def group_by_year(rows):
    out = []
    for s in range(0, len(rows), 12):
        c = rows[s:s + 12]
        out.append({
            "year": s // 12 + 1,
            "paidCents": sum(r["paymentCents"] for r in c),
            "interestCents": sum(r["interestCents"] for r in c),
            "principalCents": sum(r["principalCents"] for r in c),
            "balanceCents": c[-1]["balanceCents"],
        })
    return out


def add_months(year, month, offset):
    index = year * 12 + (month - 1) + offset
    y, m = index // 12, index % 12 + 1
    return {"year": y, "month": m, "label": "%s %d" % (MONTH_NAMES[m - 1], y)}


def minimum_payment(principal, accrued, bps, months):
    """Smallest whole-cent payment that clears the loan in `months` payments."""
    lo = 1
    hi = principal + accrued + month_interest(principal, bps) + 1
    while lo < hi:
        mid = (lo + hi) // 2
        if run_schedule(principal, accrued, bps, mid, months, False) is not None:
            hi = mid
        else:
            lo = mid + 1
    return lo


def _toggle(v):
    return v is True or (isinstance(v, str) and v.strip().lower() in ("true", "yes", "on"))


def read_student_input(inp):
    src = inp if isinstance(inp, dict) else {}
    problems = []

    def add(field, kind, key):
        problems.append({"field": field, "kind": kind, "message": MESSAGES[key]})

    def blank(name):
        v = src.get(name)
        return v is None or (isinstance(v, str) and v.strip() == "")

    principal = rate = wait = 0
    payment = start = years = None
    if blank("balance"):
        add("balance", "missing", "balanceMissing")
    else:
        v = parse_money(src.get("balance"))
        if v is None or v <= 0:
            add("balance", "bad", "balanceBad")
        elif v > MAX_AMOUNT_CENTS:
            add("balance", "bad", "balanceBig")
        else:
            principal = v
    if blank("rate"):
        add("rate", "missing", "rateMissing")
    else:
        v = parse_rate(src.get("rate"))
        if v is None or v < 0 or v > MAX_RATE_BPS:
            add("rate", "bad", "rateBad")
        else:
            rate = v
    if not blank("waitMonths"):
        n = parse_whole_number(src.get("waitMonths"))
        if n is None or n > MAX_WAIT_MONTHS:
            add("waitMonths", "bad", "waitBad")
        else:
            wait = n
    if not blank("payment"):
        v = parse_money(src.get("payment"))
        if v is None or v <= 0 or v > MAX_AMOUNT_CENTS:
            add("payment", "bad", "paymentBad")
        else:
            payment = v
    if not blank("start"):
        raw = src.get("start")
        m = START_RE.match(raw.strip()) if isinstance(raw, str) else None
        year = int(m.group(1)) if m else 0
        month = int(m.group(2)) if m else 0
        if not m or month < 1 or month > 12 or year < MIN_START_YEAR or year > MAX_START_YEAR:
            add("start", "bad", "startBad")
        else:
            start = (year, month)
    if not blank("years"):
        n = parse_whole_number(src.get("years"))
        if n is None or n < 1 or n > MAX_YEARS:
            add("years", "bad", "yearsBad")
        else:
            years = n
    if problems:
        return {"ok": False, "problems": problems}
    return {"ok": True, "principalCents": principal, "rateBps": rate, "waitMonths": wait,
            "capitalize": _toggle(src.get("capitalize")), "paymentCents": payment, "start": start, "years": years}


def explain_student_loan(inp):
    read = read_student_input(inp)
    if not read["ok"]:
        return read
    principal, bps, wait = read["principalCents"], read["rateBps"], read["waitMonths"]
    wait_interest = month_interest(principal, bps)
    accrued = wait_interest * wait
    balance_at_start = principal + accrued
    if balance_at_start > MAX_SAFE:
        return {"ok": False, "problems": [{"field": "balance", "kind": "bad", "message": MESSAGES["tooBig"]}]}
    bearing = balance_at_start if read["capitalize"] else principal
    apart = 0 if read["capitalize"] else accrued

    payoff = None
    if read["paymentCents"] is not None:
        run = run_schedule(bearing, apart, bps, read["paymentCents"], MAX_PAYOFF_MONTHS, True)
        if run is None:
            return {"ok": False, "problems": [{"field": "payment", "kind": "bad", "message": MESSAGES["paymentSmall"]}]}
        months, paid, rows = run
        start = read["start"]
        payoff = {"months": months, "totalPaidCents": paid, "totalInterestCents": paid - principal,
                  "payoffDate": add_months(start[0], start[1], months - 1) if start else None,
                  "byYear": group_by_year(rows)}

    min_payment = None
    if read["years"] is not None:
        y = read["years"]
        min_payment = {"years": y, "months": y * 12, "paymentCents": minimum_payment(bearing, apart, bps, y * 12)}

    return {"ok": True, "principalCents": principal, "rateBps": bps, "waitMonths": wait,
            "capitalize": read["capitalize"], "paymentCents": read["paymentCents"],
            "monthlyInterestCents": wait_interest, "unpaidInterestCents": accrued,
            "balanceAtStartCents": balance_at_start, "payoff": payoff, "minPayment": min_payment}


END_LINE = "This is an estimate from the numbers you typed. The paper from your bank or lender has the final word."


def money_text(cents):
    """Whole cents -> dollars with commas and two decimals, like $10,951.88."""
    sign = "-" if cents < 0 else ""
    c = abs(cents)
    return "%s$%s.%02d" % (sign, format(c // 100, ","), c % 100)


def percent_text(bps):
    """Basis points -> a percent, like 6% or 7.25%."""
    whole, frac = divmod(bps, 100)
    return "%d%%" % whole if frac == 0 else ("%d.%02d" % (whole, frac)).rstrip("0") + "%"


def count_text(n, word):
    return "%s %s%s" % (format(n, ","), word, "" if n == 1 else "s")


def months_text(months):
    """Months, with years and months added when it is a year or more."""
    base = count_text(months, "month")
    if months < 12:
        return base
    years, rest = divmod(months, 12)
    parts = [count_text(years, "year")] + ([count_text(rest, "month")] if rest else [])
    return "%s (%s)" % (base, " and ".join(parts))


def problem_lines(result):
    return ["Fix this first: %s" % p["message"] for p in result.get("problems", [])] or ["Fix this first: Something is wrong with the numbers."]


def student_text(result):
    """The same answer as plain words in dollars, one short fact per line."""
    if not result.get("ok"):
        return problem_lines(result)
    r = result
    lines = [
        "Loan balance: %s" % money_text(r["principalCents"]),
        "Yearly interest rate: %s" % percent_text(r["rateBps"]),
        "Months with no payments so far: %s" % count_text(r["waitMonths"], "month"),
        "Add the unpaid interest to my balance: %s" % ("yes" if r["capitalize"] else "no"),
        "Balance when payments start: %s" % money_text(r["balanceAtStartCents"]),
        "Interest that grew while you waited: %s" % money_text(r["unpaidInterestCents"]),
    ]
    if r["paymentCents"] is not None:
        lines.append("Monthly payment: %s" % money_text(r["paymentCents"]))
    p = r["payoff"]
    if p:
        lines.append("Months to pay off: %s" % months_text(p["months"]))
        lines.append("Total interest: %s" % money_text(p["totalInterestCents"]))
        if p["payoffDate"]:
            lines.append("Payoff month: %s" % p["payoffDate"]["label"])
    m = r["minPayment"]
    if m:
        lines.append("Smallest payment to finish in %s: %s" % (count_text(m["years"], "year"), money_text(m["paymentCents"])))
    lines.append(END_LINE)
    return lines


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
        unreadable = {"ok": False, "problems": [{"field": "balance", "kind": "bad",
                      "message": "The input was not readable. Send the numbers as JSON."}]}
        print("\n".join(student_text(unreadable)) if as_text else json.dumps(unreadable))
        return 1
    result = explain_student_loan(data)
    if as_text:
        print("\n".join(student_text(result)))
        return 0 if result["ok"] else 1
    print(json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
