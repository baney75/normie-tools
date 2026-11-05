#!/usr/bin/env python3
"""Loan Offer Compare math. Standard library only. No network use.

Usage:
  python3 calc.py '{"offers":[{"amount":"10,000","rate":"6","term":"36","termUnit":"months","fees":""},{"amount":"10,000","rate":"5","term":"48","termUnit":"months","fees":"200"}]}'
  python3 calc.py --file input.json
  python3 calc.py --file input.json --text    (same answer in plain words and dollars)

Prints one JSON object. On good input it holds each offer's numbers (money in whole cents, rates in
basis points) and which offers have the lowest cost of borrowing and the lowest monthly payment.
On bad input it holds {"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/loan-offer-compare/calc.mjs and tools/_shared/money.mjs.
Both must give the same answers (tests/golden.json). Rounding is half up to the cent, only
for each monthly payment (once) and each month's interest. The last payment is trued up.
"Lowest" is a fact about the typed numbers. It is not an APR and it is not advice.
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


MESSAGES = {
    "needTwo": "Type at least two offers to compare.",
    "tooMany": "This tool compares up to three offers.",
    "amountMissing": "Type the amount borrowed.",
    "amountBad": "Amount borrowed: use a number above zero, like 12,000.",
    "amountBig": "Amount borrowed: that is too big for this tool. Use $1,000,000,000 or less.",
    "rateMissing": "Type the yearly interest rate. Type 0 if there is none.",
    "rateBad": "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
    "termMissing": "Type how long the loan lasts.",
    "termBad": "Loan length: use a whole number. Up to 1,200 months or 100 years.",
    "feesBad": "Upfront fees: use a dollar amount like 250, or leave it empty.",
    "tooBig": "These numbers are too big to work out. Try smaller ones.",
}
MIN_OFFERS = 2
MAX_OFFERS = 3


def read_offer(inp):
    """Read one offer. Returns (values, None) or (None, [(field, kind, key), ...])."""
    src = inp if isinstance(inp, dict) else {}
    problems = []

    def blank(name):
        v = src.get(name)
        return v is None or (isinstance(v, str) and v.strip() == "")

    principal = rate = months = fees = 0
    if blank("amount"):
        problems.append(("amount", "missing", "amountMissing"))
    else:
        v = parse_money(src.get("amount"))
        if v is None or v <= 0:
            problems.append(("amount", "bad", "amountBad"))
        elif v > MAX_AMOUNT_CENTS:
            problems.append(("amount", "bad", "amountBig"))
        else:
            principal = v
    if blank("rate"):
        problems.append(("rate", "missing", "rateMissing"))
    else:
        v = parse_rate(src.get("rate"))
        if v is None or v < 0 or v > MAX_RATE_BPS:
            problems.append(("rate", "bad", "rateBad"))
        else:
            rate = v
    if blank("term"):
        problems.append(("term", "missing", "termMissing"))
    else:
        n = parse_whole_number(src.get("term"))
        total = None if n is None else (n * 12 if src.get("termUnit") == "years" else n)
        if total is None or total < 1 or total > MAX_MONTHS:
            problems.append(("term", "bad", "termBad"))
        else:
            months = total
    if not blank("fees"):
        v = parse_money(src.get("fees"))
        if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
            problems.append(("fees", "bad", "feesBad"))
        else:
            fees = v
    if problems:
        return None, problems
    return (principal, rate, months, fees), None


def calc_offer(principal, rate, months, fees):
    pay = monthly_payment(principal, rate, months)
    if pay is None:
        return None
    plain = amortize(principal, rate, months, payment=pay)
    if plain is None:
        return None
    _rows, paid, interest = plain
    return {"principalCents": principal, "rateBps": rate, "months": months, "feesCents": fees,
            "monthlyPaymentCents": pay, "totalPaidCents": paid, "totalInterestCents": interest,
            "costOfBorrowingCents": interest + fees}


def lowest_of(values):
    low = min(values)
    idx = [i for i, v in enumerate(values) if v == low]
    return {"offers": idx, "tie": len(idx) > 1}


def _problem(offer, field, kind, message):
    return {"offer": offer, "field": field, "kind": kind, "message": message}


def compare_offers(inp):
    lst = inp.get("offers") if isinstance(inp, dict) else None
    lst = lst if isinstance(lst, list) else []
    if len(lst) < MIN_OFFERS:
        return {"ok": False, "problems": [_problem(None, "offers", "missing", MESSAGES["needTwo"])]}
    if len(lst) > MAX_OFFERS:
        return {"ok": False, "problems": [_problem(None, "offers", "bad", MESSAGES["tooMany"])]}
    problems = []
    read = []
    for i, o in enumerate(lst):
        vals, probs = read_offer(o)
        read.append(vals)
        for field, kind, key in probs or []:
            problems.append(_problem(i, field, kind, "Offer %d: %s" % (i + 1, MESSAGES[key])))
    if problems:
        return {"ok": False, "problems": problems}
    offers = [calc_offer(*v) for v in read]
    if any(o is None for o in offers):
        return {"ok": False, "problems": [_problem(None, "amount", "bad", MESSAGES["tooBig"])]}
    first = offers[0]
    same = all(o["principalCents"] == first["principalCents"] and o["months"] == first["months"] for o in offers)
    return {"ok": True, "offers": offers,
            "lowestCost": lowest_of([o["costOfBorrowingCents"] for o in offers]),
            "lowestPayment": lowest_of([o["monthlyPaymentCents"] for o in offers]),
            "sameAmountAndLength": same}


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


def offer_text(result):
    """The same answer as plain words in dollars, one short fact per line."""
    if not result.get("ok"):
        return problem_lines(result)
    lines = []
    for i, o in enumerate(result["offers"]):
        name = "Offer %d" % (i + 1)
        lines += [
            "%s amount borrowed: %s" % (name, money_text(o["principalCents"])),
            "%s yearly interest rate: %s" % (name, percent_text(o["rateBps"])),
            "%s loan length: %s" % (name, months_text(o["months"])),
            "%s upfront fees: %s" % (name, money_text(o["feesCents"])),
            "%s monthly payment: %s" % (name, money_text(o["monthlyPaymentCents"])),
            "%s total paid: %s" % (name, money_text(o["totalPaidCents"])),
            "%s total interest: %s" % (name, money_text(o["totalInterestCents"])),
            "%s cost of borrowing: %s (interest plus upfront fees)" % (name, money_text(o["costOfBorrowingCents"])),
        ]
    for key, label, tie, one in (
            ("lowestCost", "cost of borrowing", "These offers tie on cost of borrowing", "Lowest cost of borrowing"),
            ("lowestPayment", "monthly payment", "These offers tie on monthly payment", "Lowest monthly payment")):
        names = ["Offer %d" % (i + 1) for i in result[key]["offers"]]
        if result[key]["tie"]:
            lines.append("%s: %s." % (tie, " and ".join(names)))
        else:
            lines.append("%s: %s." % (one, names[0]))
    lines.append("Compared on cost of borrowing (interest plus upfront fees) and on monthly payment.")
    if not result["sameAmountAndLength"]:
        lines.append("These offers differ in amount or length. Their totals are for different loans.")
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
        unreadable = {"ok": False, "problems": [_problem(None, "offers", "bad",
                      "The input was not readable. Send the offers as JSON.")]}
        print("\n".join(offer_text(unreadable)) if as_text else json.dumps(unreadable))
        return 1
    result = compare_offers(data)
    if as_text:
        print("\n".join(offer_text(result)))
        return 0 if result["ok"] else 1
    print(json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
