#!/usr/bin/env python3
"""Add receipt prices in whole cents. Standard library only. No network use.

Usage: python3 receipt_totals.py receipts.csv
"""
import csv
import re
import sys
from collections import OrderedDict

PRICE = re.compile(r"^-?\d+(\.\d{1,2})?$")


def to_cents(text):
    """'3.49' -> 349, '-1.00' -> -100. Returns None for anything unclear."""
    text = (text or "").strip().lstrip("$")
    if not PRICE.match(text):
        return None
    neg = text.startswith("-")
    whole, _, frac = text.lstrip("-").partition(".")
    cents = int(whole) * 100 + int((frac + "00")[:2])
    return -cents if neg else cents


def money(cents):
    sign = "-" if cents < 0 else ""
    return f"{sign}{abs(cents) // 100}.{abs(cents) % 100:02d}"


def totals(rows):
    """Returns (per_store cents dict, total cents, rows to check as line numbers)."""
    per_store = OrderedDict()
    flagged = []
    for n, row in enumerate(rows, start=2):
        cents = to_cents(row.get("price"))
        if cents is None or (row.get("check") or "").strip():
            flagged.append(n)
        if cents is None:
            continue
        store = (row.get("store") or "").strip() or "(no store)"
        per_store[store] = per_store.get(store, 0) + cents
    return per_store, sum(per_store.values()), flagged


def main(argv):
    if len(argv) != 2:
        print("Usage: python3 receipt_totals.py receipts.csv", file=sys.stderr)
        return 2
    with open(argv[1], newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    per_store, total, flagged = totals(rows)
    for store, cents in per_store.items():
        print(f"{store}: {money(cents)}")
    print(f"total: {money(total)}")
    if flagged:
        print("check this: line " + ", ".join(str(n) for n in flagged))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
