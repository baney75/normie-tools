#!/usr/bin/env python3
"""Tax Filing Helper practice check. Standard library only. No network use.

It compares answers typed on PRACTICE screens with a made-up answer sheet and says what matches.
Nothing is filed, sent or submitted. It is a match check, not tax advice.

Usage:
  python3 calc.py --file input.json          JSON out
  python3 calc.py --text --file input.json   plain words out, one fact per line
  python3 calc.py '{"typed":{"first-name":"Sample"}}'

Input: {"sheet": [...optional...], "typed": {"<id>": "<typed text>"}}
Each sheet item: {"id","screen","label","kind":"text"|"money","value"}.
Without a sheet, the made-up practice sheet is used.

This is a Python copy of tools/tax-filing-helper/calc.mjs and tools/_shared/money.mjs.
Both must give the same answers (tests/golden.json). Money is compared in whole cents.
"""
import json
import re
import sys

MAX_SAFE = 2**53 - 1
MAX_ITEMS = 60
MAX_SHOWN = 60
NUMBER_RE = re.compile(r"^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)?(?:\.([0-9]*))?$")

NOTE = "This is a practice match check with made-up answers. Nothing is filed or sent. You press Submit yourself, on the free filing site you pick on IRS.gov."

PRACTICE_SHEET = [
    {"id": "first-name", "screen": "About you", "label": "First name", "kind": "text", "value": "Sample"},
    {"id": "last-name", "screen": "About you", "label": "Last name", "kind": "text", "value": "Person"},
    {"id": "email", "screen": "About you", "label": "Email", "kind": "text", "value": "sample.person@example.com"},
    {"id": "employer", "screen": "Pay from your job", "label": "Employer name", "kind": "text", "value": "Example Bakery"},
    {"id": "wages", "screen": "Pay from your job", "label": "Pay for the year", "kind": "money", "value": "32,450.00"},
    {"id": "withheld", "screen": "Pay from your job", "label": "Tax already taken out of your pay", "kind": "money", "value": "2,810.50"},
    {"id": "bank-name", "screen": "Bank interest", "label": "Bank name", "kind": "text", "value": "Example Credit Union"},
    {"id": "interest", "screen": "Bank interest", "label": "Interest from your bank", "kind": "money", "value": "12.34"},
]


def _text(v):
    if isinstance(v, bool):
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, (int, float)):
        try:
            return str(v) if v == v and v not in (float("inf"), float("-inf")) else ""
        except Exception:
            return ""
    return ""


def parse_money(text):
    """Typed money -> integer cents, or None. A leading minus is kept."""
    s = _text(text).strip()
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


def fold_text(v):
    return " ".join(_text(v).split()).lower()


def _shown(v):
    t = " ".join(_text(v).split())
    return t[:MAX_SHOWN] + "..." if len(t) > MAX_SHOWN else t


def _bad(problems):
    return {"ok": False, "problems": problems}


def check_answers(sheet, typed):
    if not isinstance(sheet, list) or len(sheet) == 0:
        return _bad([{"field": "sheet", "kind": "missing", "message": "The answer sheet is empty. Add at least one answer."}])
    if len(sheet) > MAX_ITEMS:
        return _bad([{"field": "sheet", "kind": "bad", "message": f"The answer sheet is too long. Use {MAX_ITEMS} answers or fewer."}])
    got = typed if isinstance(typed, dict) else {}
    problems, rows, seen = [], [], set()
    for i, raw in enumerate(sheet):
        it = raw if isinstance(raw, dict) else {}
        rid = it.get("id").strip() if isinstance(it.get("id"), str) else ""
        lab = it.get("label")
        label = lab.strip() if isinstance(lab, str) and lab.strip() else f"Answer {i + 1}"
        if not rid or rid in seen:
            problems.append({"field": rid or f"sheet.{i}", "kind": "bad", "message": f"{label}: each answer needs its own id."})
            continue
        seen.add(rid)
        kind = "money" if it.get("kind") == "money" else "text"
        want = _text(it.get("value"))
        want_cents = parse_money(want) if kind == "money" else None
        if kind == "money" and (want_cents is None or want_cents < 0):
            problems.append({"field": rid, "kind": "bad", "message": f"{label}: the sheet needs a dollar amount like 1,200.50."})
            continue
        if kind == "text" and fold_text(want) == "":
            problems.append({"field": rid, "kind": "bad", "message": f"{label}: the sheet has nothing to match."})
            continue
        expected = format_money(want_cents) if kind == "money" else want.strip()
        t = _text(got[rid]) if rid in got else ""
        if t.strip() == "":
            status, message = "missing", f"{label}: nothing typed yet. The sheet says {expected}."
        elif kind == "money":
            c = parse_money(t)
            if c is None:
                status, message = "different", f'{label}: "{_shown(t)}" is not a dollar amount. The sheet says {expected}.'
            elif c == want_cents:
                status, message = "match", f"{label}: matches."
            else:
                status, message = "different", f"{label}: you typed {format_money(c)}. The sheet says {expected}."
        elif fold_text(t) == fold_text(want):
            status, message = "match", f"{label}: matches."
        else:
            status, message = "different", f'{label}: you typed "{_shown(t)}". The sheet says "{expected}".'
        screen = it.get("screen")
        rows.append({"id": rid, "screen": screen if isinstance(screen, str) else "", "label": label, "kind": kind,
                     "expected": expected, "typed": _shown(t), "status": status, "message": message})
    if problems:
        return _bad(problems)
    matched = sum(1 for r in rows if r["status"] == "match")
    missing = sum(1 for r in rows if r["status"] == "missing")
    total = len(rows)
    all_match = matched == total
    summary = f"All {total} answers match." if all_match else f"{matched} of {total} answers match. {total - matched} need a look."
    return {"ok": True, "total": total, "matched": matched, "different": total - matched - missing,
            "missing": missing, "allMatch": all_match, "summary": summary, "rows": rows}


def check_input(data):
    """Read {"sheet": optional, "typed": {...}} and run the check."""
    if not isinstance(data, dict):
        return _bad([{"field": "typed", "kind": "bad", "message": "The input was not readable. Send the typed answers as JSON."}])
    sheet = data["sheet"] if "sheet" in data else PRACTICE_SHEET
    return check_answers(sheet, data.get("typed"))


def to_text(result):
    """Plain words, one fact per line: the lines that need a look first, then the count, then a note line. The list of matches shows only when all match. Problems start with 'Fix this first:'."""
    lines = []
    if not result.get("ok"):
        for p in result.get("problems", []):
            lines.append(f"Fix this first: {p['message']}")
    else:
        for r in result["rows"]:
            if r["status"] != "match":
                lines.append(r["message"])
        lines.append(result["summary"])
        if result["allMatch"]:
            lines.append("They are: " + ", ".join(r["label"] for r in result["rows"]) + ".")
    lines.append(f"Note: {NOTE}")
    return "\n".join(lines)


def main(argv):
    text = "--text" in argv
    argv = [a for a in argv if a != "--text"]
    if len(argv) >= 2 and argv[0] == "--file":
        try:
            with open(argv[1], encoding="utf-8") as f:
                raw = f.read()
        except OSError:
            raw = None
    elif argv:
        raw = argv[0]
    else:
        print(__doc__)
        return 2
    try:
        if raw is None:
            raise ValueError
        data = json.loads(raw)
    except ValueError:
        result = _bad([{"field": "typed", "kind": "bad", "message": "The input was not readable. Send the typed answers as JSON."}])
        print(to_text(result) if text else json.dumps(result))
        return 1
    result = check_input(data)
    print(to_text(result) if text else json.dumps(result, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
