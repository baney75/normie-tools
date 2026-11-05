#!/usr/bin/env python3
"""Mortgage Payment Explainer math. Standard library only. No network use.

Usage:
  python3 calc.py '{"price":"300,000","down":"60,000","rate":"6","term":"30","tax":"3600","insurance":"1200","hoa":"50","pmi":""}'
  python3 calc.py --file input.json
  python3 calc.py --file input.json --text    (same answer in plain words and dollars)

Prints one JSON object. On good input it holds the answer (money in whole cents, rates in
basis points). On bad input it holds {"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/mortgage-payment-explainer/calc.mjs and tools/_shared/money.mjs.
Both must give the same answers (tests/golden.json). Rounding is half up to the cent, only for
the loan payment (once), each month's interest, and yearly tax and insurance divided by 12.
The last loan payment is trued up. This is an estimate from typed numbers. It is not advice.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_AMOUNT_CENTS = 100_000_000_000  # $1,000,000,000
MAX_RATE_BPS = 10000  # 100%
MAX_YEARS = 100
D = 120000  # monthly rate = bps / 120000

NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")

MESSAGES = {
    "priceMissing": "Type the home price.",
    "priceBad": "Home price: use a number above zero, like 300,000.",
    "priceBig": "Home price: that is too big for this tool. Use $1,000,000,000 or less.",
    "downMissing": "Type your down payment in dollars. Type 0 if there is none.",
    "downBad": "Down payment: use a dollar amount like 60,000. Type 0 if there is none.",
    "downBig": "Down payment: it must be less than the home price.",
    "rateMissing": "Type the yearly interest rate. Type 0 if there is none.",
    "rateBad": "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
    "termMissing": "Type how many years the loan lasts.",
    "termBad": "Loan length: use a whole number of years, from 1 to 100.",
    "taxBad": "Property tax for the year: use a dollar amount like 3,600, or leave it empty.",
    "insuranceBad": "Home insurance for the year: use a dollar amount like 1,200, or leave it empty.",
    "hoaBad": "HOA each month: use a dollar amount like 50, or leave it empty.",
    "pmiBad": "Mortgage insurance each month: use a dollar amount like 95, or leave it empty.",
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


def monthly_payment(principal, bps, months):
    """Level monthly payment in cents, rounded half up once. At least 1 cent."""
    if not (isinstance(principal, int) and principal > 0 and principal <= MAX_SAFE):
        return None
    if not (isinstance(bps, int) and bps >= 0):
        return None
    if not (isinstance(months, int) and 1 <= months <= 12000):
        return None
    if bps == 0:
        result = div_round_half_up(principal, months)
    else:
        up = (D + bps) ** months
        base = D**months
        result = div_round_half_up(principal * bps * up, D * (up - base))
    return max(result, 1)


def amortize(principal, bps, months, payment=None, extra=0):
    """Month by month schedule. Returns (rows, total_paid, total_interest) or None."""
    base = payment if payment is not None else monthly_payment(principal, bps, months)
    if base is None or base <= 0 or extra < 0:
        return None
    pay = base + extra
    balance = principal
    total_paid = 0
    total_interest = 0
    rows = []
    month = 1
    while balance > 0 and month <= months:
        interest = div_round_half_up(balance * bps, D)
        pmt = pay
        if month == months or pmt >= balance + interest:
            pmt = balance + interest
        part = pmt - interest
        balance -= part
        total_paid += pmt
        total_interest += interest
        rows.append({"month": month, "paymentCents": pmt, "interestCents": interest,
                     "principalCents": part, "balanceCents": balance})
        month += 1
    return rows, total_paid, total_interest


def read_mortgage_input(inp):
    src = inp if isinstance(inp, dict) else {}
    problems = []

    def add(field, kind, key):
        problems.append({"field": field, "kind": kind, "message": MESSAGES[key]})

    def blank(name):
        v = src.get(name)
        return v is None or (isinstance(v, str) and v.strip() == "")

    price = down = rate = months = 0
    price_ok = False
    if blank("price"):
        add("price", "missing", "priceMissing")
    else:
        v = parse_money(src.get("price"))
        if v is None or v <= 0:
            add("price", "bad", "priceBad")
        elif v > MAX_AMOUNT_CENTS:
            add("price", "bad", "priceBig")
        else:
            price, price_ok = v, True
    if blank("down"):
        add("down", "missing", "downMissing")
    else:
        v = parse_money(src.get("down"))
        if v is None or v < 0:
            add("down", "bad", "downBad")
        elif v > MAX_AMOUNT_CENTS or (price_ok and v >= price):
            add("down", "bad", "downBig")
        else:
            down = v
    if blank("rate"):
        add("rate", "missing", "rateMissing")
    else:
        v = parse_rate(src.get("rate"))
        if v is None or v < 0 or v > MAX_RATE_BPS:
            add("rate", "bad", "rateBad")
        else:
            rate = v
    if blank("term"):
        add("term", "missing", "termMissing")
    else:
        n = parse_whole_number(src.get("term"))
        if n is None or n < 1 or n > MAX_YEARS:
            add("term", "bad", "termBad")
        else:
            months = n * 12

    def optional(field, key):
        if blank(field):
            return 0
        v = parse_money(src.get(field))
        if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
            add(field, "bad", key)
            return 0
        return v

    tax = optional("tax", "taxBad")
    insurance = optional("insurance", "insuranceBad")
    hoa = optional("hoa", "hoaBad")
    pmi = optional("pmi", "pmiBad")
    if problems:
        return {"ok": False, "problems": problems}
    return {"ok": True, "priceCents": price, "downCents": down, "rateBps": rate, "months": months,
            "taxYearCents": tax, "insuranceYearCents": insurance, "hoaCents": hoa, "pmiCents": pmi}


def explain_mortgage(inp):
    read = read_mortgage_input(inp)
    if not read["ok"]:
        return read
    loan = read["priceCents"] - read["downCents"]
    pi = monthly_payment(loan, read["rateBps"], read["months"])
    plan = amortize(loan, read["rateBps"], read["months"], payment=pi) if pi is not None else None
    if pi is None or plan is None or not plan[0]:
        return {"ok": False, "problems": [{"field": "price", "kind": "bad",
                "message": "These numbers are too big to work out. Try smaller ones."}]}
    rows, _paid, interest = plan
    tax_m = div_round_half_up(read["taxYearCents"], 12)
    ins_m = div_round_half_up(read["insuranceYearCents"], 12)
    return {"ok": True, "priceCents": read["priceCents"], "downCents": read["downCents"], "loanCents": loan,
            "rateBps": read["rateBps"], "months": read["months"], "piCents": pi,
            "taxMonthCents": tax_m, "insuranceMonthCents": ins_m, "hoaCents": read["hoaCents"],
            "pmiCents": read["pmiCents"],
            "totalMonthlyCents": pi + tax_m + ins_m + read["hoaCents"] + read["pmiCents"],
            "totalInterestCents": interest, "firstInterestCents": rows[0]["interestCents"],
            "firstPrincipalCents": rows[0]["principalCents"]}


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


def mortgage_text(result):
    """The same answer as plain words in dollars, one short fact per line."""
    if not result.get("ok"):
        return problem_lines(result)
    r = result
    return [
        "Total monthly payment: %s" % money_text(r["totalMonthlyCents"]),
        "Home price: %s" % money_text(r["priceCents"]),
        "Down payment: %s" % money_text(r["downCents"]),
        "Loan amount: %s" % money_text(r["loanCents"]),
        "Yearly interest rate: %s" % percent_text(r["rateBps"]),
        "Loan length: %s" % months_text(r["months"]),
        "Principal and interest: %s" % money_text(r["piCents"]),
        "Property tax each month: %s" % money_text(r["taxMonthCents"]),
        "Home insurance each month: %s" % money_text(r["insuranceMonthCents"]),
        "HOA each month: %s" % money_text(r["hoaCents"]),
        "Mortgage insurance each month: %s" % money_text(r["pmiCents"]),
        "Total interest over the loan: %s" % money_text(r["totalInterestCents"]),
        "Your first payment goes to interest: %s" % money_text(r["firstInterestCents"]),
        "Your first payment lowers what you owe: %s" % money_text(r["firstPrincipalCents"]),
        END_LINE,
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
        unreadable = {"ok": False, "problems": [{"field": "price", "kind": "bad",
                      "message": "The input was not readable. Send the numbers as JSON."}]}
        print("\n".join(mortgage_text(unreadable)) if as_text else json.dumps(unreadable))
        return 1
    result = explain_mortgage(data)
    if as_text:
        print("\n".join(mortgage_text(result)))
        return 0 if result["ok"] else 1
    print(json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
