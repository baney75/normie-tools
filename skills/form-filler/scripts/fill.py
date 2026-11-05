#!/usr/bin/env python3
"""Build the Form Filler answer sheet from a JSON file, and check every box.

Standard library only. No network. Never sends, signs, pays, files or submits anything.
It reads JSON with json.loads and never runs anything it reads.

  python3 fill.py --file answers.json            JSON out
  python3 fill.py --file answers.json --text     plain words out (one fact per line)
  python3 fill.py --file answers.json --sheet    the answer sheet only

There is no Social Security number box. The person types it on the free filing site you pick on IRS.gov.
"""
import argparse
import json
import re
import sys

FORMAT = "nt-form-filler"
VERSION = 1
MAX_FILE_CHARS = 200000
MAX_TEXT = 100

LINKS = {
    "freeFile": "https://www.irs.gov/freefile",
    "freeFilePage": "https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free",
    "vita": "https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers",
}
VITA_PHONE = "800-906-9887"

QUESTION_IDS = ["filing", "income", "fillable", "open"]
CHOICES = ["yes", "no", "unsure"]

PAPERS = [
    ("ssn", "Social Security number or ITIN, for each person on your return"),
    ("w2", "W-2, the pay form from each job"),
    ("1099", "1099 forms, for other money you got"),
    ("1095a", "1095-A, if you had health insurance from the Marketplace"),
    ("lastreturn", "Last year's tax return, if you filed one"),
    ("ippin", "IP code the IRS sent you, if any"),
    ("bank", "Bank account details, if you want your refund sent to your bank"),
    ("credits", "Papers for credits (if you have them)"),
    ("sidejob", "For side jobs: what you were paid, and receipts for what you spent"),
]
PAPER_IDS = [p[0] for p in PAPERS]

INFO_FIELDS = [
    ("firstName", "First name"),
    ("lastName", "Last name"),
    ("street", "Street address"),
    ("city", "City"),
    ("state", "State"),
    ("zip", "ZIP code"),
    ("birthDate", "Birth date"),
    ("phone", "Phone number"),
]
LABELS = dict(INFO_FIELDS)

STATES = (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR "
    "PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI AA AE AP"
).split()

SSN_LINE = "You type your Social Security number yourself on the free filing site you pick on IRS.gov."
YOU_DO = [
    "Make your Free File account.",
    "Check every number on the review page.",
    "Sign with the income number from last year's return, or a 5-digit code you pick.",
    "Press Submit, the button that sends your tax return.",
    "If you owe tax, you pay it yourself.",
]
CHOICE_WORDS = {"yes": "Yes", "no": "No", "unsure": "Not sure", "": "Not answered"}
QUESTION_TEXT = {
    "filing": "Are you filing this year's taxes?",
    "income": "Was your income $95,000 or less last year?",
    "fillable": "Are you willing to type into online copies of the IRS forms yourself?",
    "open": "Is Free File open on IRS.gov yet?",
}
NEVER_LINE = (
    "This tool never presses Submit, signs for you, pays anything, or picks an extra that costs money. "
    "It never asks for your Free File password."
)
START_LINE = (
    "Always start at IRS.gov/freefile. If you go straight to a tax company's website, "
    "you won't get the free deal."
)
CARD_LINE = "If any screen asks for a card number, stop."
NOTE_LINE = "Note: This is a list of answers, not a tax return. You make your account, sign, and press Submit yourself."

BAD_CHARS = set("<>{}[]") | {chr(92)} | set(";=@$%^*|~`")


def tidy(v):
    return " ".join(v.split()) if isinstance(v, str) else ""


def has_control(s):
    for ch in s.replace("\t", " ").replace("\r", " ").replace("\n", " "):
        if ord(ch) < 32 or ord(ch) == 127:
            return True
    return False


def real_date(y, m, d):
    if not (1000 <= y <= 9999 and 1 <= m <= 12 and d >= 1):
        return False
    leap = (y % 4 == 0 and y % 100 != 0) or y % 400 == 0
    days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    return d <= days


def has_letter(s):
    return any(ch.isalpha() for ch in s)


def has_bad(s):
    return any(ch in BAD_CHARS for ch in s)


def has_digit(s):
    return any(ch in "0123456789" for ch in s)


def check_info(field, value):
    """Return (True, cleaned) or (False, message). A blank box is fine."""
    name = LABELS.get(field, str(field))
    if not isinstance(value, str):
        return False, f"{name}: type it as words or numbers."
    text = tidy(value)
    if text == "":
        return True, ""
    if len(text) > MAX_TEXT:
        return False, f"{name}: this is too long. Keep it under {MAX_TEXT} letters."
    if has_control(value):
        return False, f"{name}: use letters and numbers only."
    if field in ("firstName", "lastName", "city"):
        if has_digit(text) or has_bad(text) or not has_letter(text):
            return False, f"{name}: use letters only. No numbers."
        return True, text
    if field == "street":
        if has_bad(text):
            return False, f"{name}: use letters and numbers only."
        return True, text
    if field == "state":
        up = text.upper()
        if up not in STATES:
            return False, f"{name}: pick your state from the list."
        return True, up
    if field == "zip":
        if not re.fullmatch(r"[0-9]{5}(-[0-9]{4})?", text):
            return False, f"{name}: type 5 numbers, like 12345."
        return True, text
    if field == "birthDate":
        hit = re.fullmatch(r"([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})", text)
        if hit:
            y, m, d = int(hit.group(1)), int(hit.group(2)), int(hit.group(3))
        else:
            hit = re.fullmatch(r"([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})", text)
            if hit:
                m, d, y = int(hit.group(1)), int(hit.group(2)), int(hit.group(3))
        if not hit or not real_date(y, m, d):
            return False, f"{name}: pick a real date."
        return True, f"{y:04d}-{m:02d}-{d:02d}"
    if field == "phone":
        if not re.fullmatch(r"[0-9 ()+.\-]+", text):
            return False, f"{name}: type 10 numbers, like 555-010-1234."
        digits = "".join(ch for ch in text if ch in "0123456789")
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]
        if len(digits) != 10:
            return False, f"{name}: type 10 numbers, like 555-010-1234."
        return True, f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return False, f"{name}: this box is not known."


def show_date(iso):
    m = re.fullmatch(r"([0-9]{4})-([0-9]{2})-([0-9]{2})", iso)
    return f"{m.group(2)}/{m.group(3)}/{m.group(1)}" if m else iso


def empty_data():
    return {
        "answers": {q: "" for q in QUESTION_IDS},
        "info": {f: "" for f, _ in INFO_FIELDS},
        "papers": [],
    }


def clean_data(raw):
    """Return (data, problems). Copies only the known boxes into a new dict."""
    data = empty_data()
    problems = []
    if not isinstance(raw, dict):
        return None, [{"field": "file", "message": "This is not an answer file from Form Filler."}]
    answers = raw.get("answers") if isinstance(raw.get("answers"), dict) else {}
    for q in QUESTION_IDS:
        v = answers.get(q, "")
        if v == "" or v is None:
            continue
        if isinstance(v, str) and v in CHOICES:
            data["answers"][q] = v
        else:
            problems.append({"field": q, "message": f"{QUESTION_TEXT[q]} Use yes, no, or unsure."})
    info = raw.get("info") if isinstance(raw.get("info"), dict) else {}
    for f, _ in INFO_FIELDS:
        v = info.get(f, "")
        if v is None:
            continue
        ok, out = check_info(f, v)
        if ok:
            data["info"][f] = out
        else:
            problems.append({"field": f, "message": out})
    if "papers" in raw and not isinstance(raw["papers"], list):
        problems.append({"field": "papers", "message": "Papers: this should be a list."})
    elif isinstance(raw.get("papers"), list):
        seen = set()
        for p in raw["papers"]:
            if isinstance(p, str) and p in PAPER_IDS:
                seen.add(p)
            else:
                problems.append({"field": "papers", "message": "Papers: one item is not on the list."})
        data["papers"] = [i for i in PAPER_IDS if i in seen]
    if problems:
        return None, problems
    return data, []


def parse_saved(text):
    def bad(message):
        return None, [{"field": "file", "message": message}]

    if not isinstance(text, str) or text.strip() == "":
        return bad("This file is empty.")
    if len(text) > MAX_FILE_CHARS:
        return bad("This file is too big to be an answer file.")
    try:
        raw = json.loads(text)
    except ValueError:
        return bad("This is not an answer file from Form Filler.")
    if not isinstance(raw, dict) or raw.get("format") != FORMAT:
        return bad("This is not an answer file from Form Filler.")
    v = raw.get("version")
    if type(v) is not int or v != VERSION:
        return bad("This answer file is from a different version.")
    return clean_data(raw)


def pick_way(answers):
    a = {q: "" for q in QUESTION_IDS}
    if isinstance(answers, dict):
        a.update(answers)
    lines = []
    if a["filing"] == "no":
        way, name = "past", "Not Free File"
        lines.append("Free File only does this year's taxes. It can't do taxes from past years.")
        lines.append("Check IRS.gov for help with past years.")
    elif a["income"] == "yes":
        way, name = "guided", "Guided Free File"
        lines.append("Guided Free File asks simple questions, one at a time. The software does the math.")
        lines.append("Last season it was free for people with income of $95,000 or less. Check IRS.gov for this year's limit.")
        lines.append("Each company also sets its own rules, such as age or state.")
        lines.append("Some companies do your state return for free, some charge.")
    elif a["income"] == "no":
        way, name = "fillable", "Free File Fillable Forms"
        lines.append("Free File Fillable Forms works at any income.")
        lines.append("You type into online copies of the IRS forms. Only some of the math is done for you.")
        lines.append("State taxes are not included.")
        if a["fillable"] in ("no", "unsure"):
            lines.append("If you would rather not do the work yourself, a VITA volunteer can help for free.")
    else:
        way, name = "check", "Find your income number first"
        lines.append("The IRS calls your income number adjusted gross income, or AGI.")
        lines.append("You can see it by signing in to your IRS online account, under Tax Records.")
        lines.append("You can also ask the IRS to mail you a copy of last year's return.")
    if way != "past":
        if a["open"] == "yes":
            lines.append("Start at IRS.gov/freefile.")
        else:
            lines.append(
                "Free File was closed when we checked on November 4, 2026. "
                "The IRS says it opens in January 2027. Check IRS.gov."
            )
    return {"way": way, "name": name, "lines": lines}


def build_sheet(raw):
    """Return {"ok": True, "text", "way", "name", "lines"} or {"ok": False, "problems"}."""
    data, problems = clean_data(raw)
    if problems:
        return {"ok": False, "problems": problems}
    answers, info, papers = data["answers"], data["info"], data["papers"]
    pick = pick_way(answers)
    out = [
        "Form Filler answer sheet",
        "This is a list of your answers. It is not a tax return. Nothing was sent.",
        "",
        "Which free way may fit",
        pick["name"],
    ]
    out += [f"- {l}" for l in pick["lines"]]
    out.append(f"- {START_LINE}")
    out.append(f"Official link: {LINKS['freeFile']}")
    out.append(f"Free help from a VITA volunteer: {LINKS['vita']} or {VITA_PHONE}")
    out += ["", "Your answers"]
    out += [f"{QUESTION_TEXT[q]} {CHOICE_WORDS[answers[q]]}" for q in QUESTION_IDS]
    out += ["", "My info"]
    for f, label in INFO_FIELDS:
        v = info[f]
        shown = "Not filled in" if v == "" else show_date(v) if f == "birthDate" else v
        out.append(f"{label}: {shown}")
    out.append(f"Social Security number: {SSN_LINE}")
    out += ["", "Papers to find"]
    out += [f"{'[x]' if pid in papers else '[ ]'} {label}" for pid, label in PAPERS]
    out += ["", "What you do yourself"]
    out += [f"- {l}" for l in YOU_DO]
    out += ["", NEVER_LINE, CARD_LINE, f"Source: IRS Free File page, {LINKS['freeFilePage']}", ""]
    return {"ok": True, "text": "\n".join(out), "way": pick["way"], "name": pick["name"], "lines": pick["lines"]}


def to_plain(result, data=None):
    """Plain words, one fact per line, a final note line. Problems start with 'Fix this first:'."""
    if not result["ok"]:
        out = [f"Fix this first: {p['message']}" for p in result["problems"]]
        out.append("Note: Nothing was saved or sent. Fix the lines above and run it again.")
        return "\n".join(out) + "\n"
    way = result["way"]
    if way == "check":
        out = ["First, find your income number."]
    elif way == "past":
        out = ["Free File is not the way for this."]
    else:
        out = [f"The free way that may fit you is {result['name']}."]
    lines = [l for l in result["lines"] if l != "Start at IRS.gov/freefile."]
    if way == "guided" and len(lines) >= 4:
        lines = lines[:2] + [lines[2] + " " + lines[3]] + lines[4:]
    out += lines
    out.append(f"Free help from a VITA volunteer: {VITA_PHONE}.")
    if way == "past":
        out.append(f"Official link: {LINKS['freeFile']}")
    else:
        out.append(f"Always start at IRS.gov/freefile: {LINKS['freeFile']}")
    out.append(SSN_LINE)
    if data is not None:
        bits = []
        for f, label in INFO_FIELDS:
            v = data["info"][f]
            bits.append(f"{label}: {'not filled in' if v == '' else show_date(v) if f == 'birthDate' else v}.")
        bits.append(f"Papers ticked: {len(data['papers'])} of {len(PAPERS)}.")
        out.append("Your answers so far. " + " ".join(bits))
    out.append(NOTE_LINE)
    return "\n".join(out) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build the Form Filler answer sheet from a JSON file.")
    ap.add_argument("--file", required=True, help="the answer file (JSON)")
    ap.add_argument("--text", action="store_true", help="print plain words instead of JSON")
    ap.add_argument("--sheet", action="store_true", help="print only the answer sheet")
    args = ap.parse_args(argv)
    try:
        with open(args.file, encoding="utf-8") as f:
            text = f.read()
    except (OSError, UnicodeDecodeError):
        result = {"ok": False, "problems": [{"field": "file", "message": "This file could not be opened."}]}
        data = None
    else:
        data, problems = parse_saved(text)
        result = build_sheet(data) if not problems else {"ok": False, "problems": problems}
    if args.text:
        sys.stdout.write(to_plain(result, data))
    elif args.sheet and result["ok"]:
        sys.stdout.write(result["text"])
    else:
        sys.stdout.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
