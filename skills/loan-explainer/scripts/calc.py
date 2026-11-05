#!/usr/bin/env python3
"""Loan Explainer math. Standard library only. No network use.

Usage:
  python3 calc.py '{"amount":"10,000","rate":"6","term":"36","termUnit":"months","fees":"","extra":""}'
  python3 calc.py --file input.json
  python3 calc.py --file input.json --text

With --text it prints the same answer as plain words in dollars instead, one fact per line.
Prints one JSON object. On good input it holds the answer (money in whole cents, rates in
basis points). On bad input it holds {"ok": false, "problems": [...]} with plain-words messages.

This is a Python copy of tools/loan-explainer/calc.mjs and tools/_shared/money.mjs.
Both must give the same answers (tests/golden.json). Rounding is half up to the cent, only
for the monthly payment (once) and each month's interest. The last payment is trued up.
This is an estimate from typed numbers. It is not an APR and it is not advice.
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

MESSAGES = {
    "amountMissing": "Type the amount borrowed.",
    "amountBad": "Amount borrowed: use a number above zero, like 12,000.",
    "amountBig": "Amount borrowed: that is too big for this tool. Use $1,000,000,000 or less.",
    "rateMissing": "Type the yearly interest rate. Type 0 if there is none.",
    "rateBad": "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
    "termMissing": "Type how long the loan lasts.",
    "termBad": "Loan length: use a whole number. Up to 1,200 months or 100 years.",
    "feesBad": "Upfront fees: use a dollar amount like 250, or leave it empty.",
    "extraBad": "Extra each month: use a dollar amount like 50, or leave it empty.",
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


def group_by_year(rows):
    out = []
    for start in range(0, len(rows), 12):
        chunk = rows[start:start + 12]
        out.append({
            "year": start // 12 + 1,
            "paidCents": sum(r["paymentCents"] for r in chunk),
            "interestCents": sum(r["interestCents"] for r in chunk),
            "principalCents": sum(r["principalCents"] for r in chunk),
            "balanceCents": chunk[-1]["balanceCents"],
        })
    return out


def read_loan_input(inp):
    src = inp if isinstance(inp, dict) else {}
    problems = []

    def add(field, kind, key):
        problems.append({"field": field, "kind": kind, "message": MESSAGES[key]})

    def blank(name):
        v = src.get(name)
        return v is None or (isinstance(v, str) and v.strip() == "")

    principal = rate = months = fees = extra = 0
    if blank("amount"):
        add("amount", "missing", "amountMissing")
    else:
        v = parse_money(src.get("amount"))
        if v is None or v <= 0:
            add("amount", "bad", "amountBad")
        elif v > MAX_AMOUNT_CENTS:
            add("amount", "bad", "amountBig")
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
    if blank("term"):
        add("term", "missing", "termMissing")
    else:
        n = parse_whole_number(src.get("term"))
        total = None if n is None else (n * 12 if src.get("termUnit") == "years" else n)
        if total is None or total < 1 or total > MAX_MONTHS:
            add("term", "bad", "termBad")
        else:
            months = total
    if not blank("fees"):
        v = parse_money(src.get("fees"))
        if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
            add("fees", "bad", "feesBad")
        else:
            fees = v
    if not blank("extra"):
        v = parse_money(src.get("extra"))
        if v is None or v < 0 or v > MAX_AMOUNT_CENTS:
            add("extra", "bad", "extraBad")
        else:
            extra = v
    if problems:
        return {"ok": False, "problems": problems}
    return {"ok": True, "principalCents": principal, "rateBps": rate, "months": months,
            "feesCents": fees, "extraCents": extra}


def explain_loan(inp):
    read = read_loan_input(inp)
    if not read["ok"]:
        return read
    p, r, n, fees, extra = (read[k] for k in ("principalCents", "rateBps", "months", "feesCents", "extraCents"))
    pay = monthly_payment(p, r, n)
    plain = amortize(p, r, n, payment=pay)
    if pay is None or plain is None:
        return {"ok": False, "problems": [{"field": "amount", "kind": "bad",
                "message": "These numbers are too big to work out. Try smaller ones."}]}
    rows, paid, interest = plain
    shown = rows
    extra_result = None
    if extra > 0:
        frows, fpaid, finterest = amortize(p, r, n, payment=pay, extra=extra)
        extra_result = {"monthlyPaymentCents": pay + extra, "months": len(frows), "totalPaidCents": fpaid,
                        "totalInterestCents": finterest, "monthsSaved": len(rows) - len(frows),
                        "interestSaved": interest - finterest}
        shown = frows
    return {"ok": True, "principalCents": p, "rateBps": r, "months": n, "feesCents": fees, "extraCents": extra,
            "monthlyPaymentCents": pay, "totalPaidCents": paid, "totalInterestCents": interest,
            "costOfBorrowingCents": interest + fees, "extra": extra_result, "byYear": group_by_year(shown)}


def _dollars(cents):
    neg = cents < 0
    a = -cents if neg else cents
    return "%s$%s.%02d" % ("-" if neg else "", format(a // 100, ","), a % 100)


def _percent(bps):
    whole, frac = divmod(bps, 100)
    return "%d%s%%" % (whole, ("." + ("%02d" % frac).rstrip("0")) if frac else "")


def _count(n, word):
    return "%d %s%s" % (n, word, "" if n == 1 else "s")


def problem_text(result):
    return "\n".join("Fix this first: %s" % p["message"] for p in result["problems"])


def result_text(r):
    """The same answer as explain_loan, as plain words in dollars. One short fact per line."""
    if not r["ok"]:
        return problem_text(r)
    out = ["Your monthly payment is %s, every month for the whole loan." % _dollars(r["monthlyPaymentCents"]),
           "The total you pay is %s." % _dollars(r["totalPaidCents"]),
           "The total interest is %s." % _dollars(r["totalInterestCents"])]
    if r["feesCents"] > 0:
        out.append("The upfront fees are %s, and they are not in the total you pay." % _dollars(r["feesCents"]))
    out.append("The cost of borrowing is %s. That is interest plus upfront fees." % _dollars(r["costOfBorrowingCents"]))
    x = r["extra"]
    if x is not None:
        out.append("With your extra %s each month, your monthly payment is %s." % (_dollars(r["extraCents"]), _dollars(x["monthlyPaymentCents"])))
        if x["monthsSaved"] == 0:
            out.append("Your extra payment is too small to finish the loan sooner.")
        else:
            out.append("You pay it off after %s, which is %s sooner." % (_count(x["months"], "month"), _count(x["monthsSaved"], "month")))
        out.append("Your total interest with the extra is %s, so you save %s in interest." % (_dollars(x["totalInterestCents"]), _dollars(x["interestSaved"])))
    out.append("This does not work out the APR. The paper from your lender shows the APR.")
    out.append("This is an estimate from the numbers you typed. The paper from your bank or lender has the final word.")
    return "\n".join(out)



def main(argv):
    text = "--text" in argv
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
        print(json.dumps({"ok": False, "problems": [{"field": "amount", "kind": "bad",
              "message": "The input was not readable. Send the numbers as JSON."}]}))
        return 1
    result = explain_loan(data)
    print(result_text(result) if text else json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
