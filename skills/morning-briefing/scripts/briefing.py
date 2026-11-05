#!/usr/bin/env python3
"""Morning Briefing. Standard library only. No network use. No clock.

Usage:
  python3 briefing.py --file input.json          prints JSON
  python3 briefing.py --file input.json --text   prints plain words, one fact per line
  python3 briefing.py '{"include":{"reminders":true},"reminders":["Call Sam"]}' --text

Input: {"include": {"weather","news","day","reminders": true}, "date": "2026-11-05",
        "day": [{"time": "7:30 am", "title": "Pills"}], "reminders": ["Water plants"]}

This is a Python copy of tools/morning-briefing/calc.mjs. Both must give the same answers
(tests/golden.json). Weather and news here are made-up EXAMPLE lines. The script never
goes online and never reads the clock: the person gives the date.
"""
import datetime
import json
import re
import sys

MAX_ITEMS = 5
MAX_TITLE = 80
SECTION_IDS = ["weather", "news", "day", "reminders"]
OFFLINE_NOTE = "Live weather and news need the NT app or your AI helper. This page does not go online."

EXAMPLE = {
    "weatherHeading": "Weather (Example)",
    "weatherLines": ["Example town: 58 degrees, clear."],
    "weatherLabel": "Example. Not today's weather.",
    "newsHeading": "News headlines (Example)",
    "newsLines": [
        "Example headline: The town pool opens for the summer.",
        "Example headline: A bake sale is on Saturday.",
        "Example headline: The library has a new sign.",
    ],
    "newsLabel": "Example. Not today's news.",
}

WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]

TIME_RE = re.compile(r"^(\d{1,2})(?::(\d{2}))?\s?(am|pm)?$")
DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")
SPACE_RE = re.compile(r"\s+")


def as_text(x):
    return x if isinstance(x, str) else ""


def tidy(x):
    return SPACE_RE.sub(" ", CONTROL_RE.sub(" ", as_text(x))).strip()


def clip(s):
    return s[:MAX_TITLE]


def parse_time(text):
    """Minutes after midnight, or None when the time is not clear."""
    s = tidy(text).lower().replace(".", "")
    if s.startswith("at "):
        s = s[3:]
    if s == "noon":
        return 720
    if s == "midnight":
        return 0
    m = TIME_RE.match(s)
    if not m or not m.group(1).isascii():
        return None
    hour = int(m.group(1))
    minute = 0 if m.group(2) is None else int(m.group(2))
    if minute > 59:
        return None
    if m.group(3):
        if hour < 1 or hour > 12:
            return None
        return ((hour % 12) + (12 if m.group(3) == "pm" else 0)) * 60 + minute
    if m.group(2) is None or hour > 23:
        return None
    if hour >= 13 or (len(m.group(1)) == 2 and m.group(1)[0] == "0"):
        return hour * 60 + minute
    return None


def format_time(minutes):
    h = minutes // 60
    return "%d:%02d %s" % (h % 12 or 12, minutes % 60, "am" if h < 12 else "pm")


def format_date(date):
    """Plain date like 'Thursday, November 5, 2026', or '' when not a real date."""
    if not isinstance(date, str):
        return ""
    m = DATE_RE.match(date.strip())
    if not m or not date.strip().isascii():
        return ""
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 1000:
        return ""
    try:
        t = datetime.date(y, mo, d)
    except ValueError:
        return ""
    return "%s, %s %d, %d" % (WEEKDAYS[(t.weekday() + 1) % 7], MONTHS[mo - 1], d, y)


def order_day(rows):
    rows = rows if isinstance(rows, list) else []
    used = []
    for r in rows:
        r = r if isinstance(r, dict) else {}
        typed, title = tidy(r.get("time")), clip(tidy(r.get("title")))
        if typed or title:
            used.append((typed, title))
    kept = used[:MAX_ITEMS]
    timed, unclear = [], []
    for order, (typed, title) in enumerate(kept):
        minutes = parse_time(typed) if typed else None
        title = title or "No title"
        if minutes is None:
            unclear.append({"typed": typed, "title": title})
        else:
            timed.append((minutes, order, title))
    timed.sort(key=lambda x: (x[0], x[1]))
    return {
        "timed": [{"minutes": m, "time": format_time(m), "title": t} for m, _, t in timed],
        "unclear": unclear,
        "left": len(used) - len(kept),
    }


def clean_reminders(rows):
    rows = rows if isinstance(rows, list) else []
    used = []
    for r in rows:
        v = r.get("text") if isinstance(r, dict) else r
        v = clip(tidy(v))
        if v:
            used.append(v)
    return {"items": used[:MAX_ITEMS], "left": max(0, len(used) - MAX_ITEMS)}


def left_note(n, what):
    return "Only the first %d %s are used. %d left out." % (MAX_ITEMS, what, n)


def build_briefing(inp):
    none = {"field": "include", "kind": "none", "message": "Pick at least one part to include."}
    if not isinstance(inp, dict):
        return {"ok": False, "problems": [dict(none, kind="missing")]}
    inc = inp.get("include") if isinstance(inp.get("include"), dict) else {}

    def on(i):
        return inc.get(i) is True

    problems = []
    if not any(on(i) for i in SECTION_IDS):
        problems.append(none)
    date_line = ""
    date = inp.get("date")
    if date is not None and date != "":
        date_line = format_date(date)
        if not date_line:
            problems.append({"field": "date", "kind": "bad",
                             "message": "The date is not clear. Use a date like 2026-11-05, or leave it out."})
    if problems:
        return {"ok": False, "problems": problems}

    sections, notes = [], []
    if on("weather"):
        sections.append({"id": "weather", "heading": EXAMPLE["weatherHeading"],
                         "lines": list(EXAMPLE["weatherLines"]), "label": EXAMPLE["weatherLabel"]})
    if on("news"):
        sections.append({"id": "news", "heading": EXAMPLE["newsHeading"],
                         "lines": list(EXAMPLE["newsLines"]), "label": EXAMPLE["newsLabel"]})
    if on("day"):
        o = order_day(inp.get("day"))
        if o["left"] > 0:
            notes.append(left_note(o["left"], "things on your day"))
        sections.append({
            "id": "day", "heading": "My day",
            "lines": ["%s: %s" % (x["time"], x["title"]) for x in o["timed"]],
            "unclearHeading": "Time not clear",
            "unclear": [("%s: %s" % (x["typed"], x["title"])) if x["typed"] else x["title"] for x in o["unclear"]],
            "empty": "Nothing on your day.",
        })
    if on("reminders"):
        r = clean_reminders(inp.get("reminders"))
        if r["left"] > 0:
            notes.append(left_note(r["left"], "reminders"))
        sections.append({"id": "reminders", "heading": "My reminders", "lines": r["items"], "empty": "No reminders."})
    offline = OFFLINE_NOTE if (on("weather") or on("news")) else ""
    out = {"ok": True, "dateLine": date_line, "sections": sections, "notes": notes, "offlineNote": offline}
    out["text"] = briefing_text(out)
    return out


def briefing_text(b):
    out = ["Morning briefing"]
    if b["dateLine"]:
        out.append(b["dateLine"])
    for s in b["sections"]:
        out.extend(["", s["heading"]])
        bullet = s["id"] in ("news", "reminders")
        if not s["lines"] and not s.get("unclear"):
            out.append(s["empty"])
        for line in s["lines"]:
            out.append("- " + line if bullet else line)
        if s.get("unclear"):
            out.append(s["unclearHeading"])
            out.extend("- " + line for line in s["unclear"])
        if s.get("label"):
            out.append(s["label"])
    if b["offlineNote"]:
        out.extend(["", b["offlineNote"]])
    for n in b["notes"]:
        out.extend(["", n])
    return "\n".join(out) + "\n"


NOTE_EXAMPLE = "Note: Weather and news lines are made-up examples. Real ones come only from your AI helper's own tools, and only if you ask."
NOTE_PLAIN = "Note: This lists only what you typed. Nothing was sent."


def to_words(result):
    """Plain words, one fact per line, a final note line. Problems start with 'Fix this first:'."""
    if not result.get("ok"):
        lines = ["Fix this first: " + p["message"] for p in result["problems"]]
        lines.append("Note: Nothing was made until this is fixed.")
        return "\n".join(lines) + "\n"
    lines = [x for x in result["text"].splitlines() if x.strip()]
    lines.append(NOTE_EXAMPLE if result["offlineNote"] else NOTE_PLAIN)
    return "\n".join(lines) + "\n"


def main(argv):
    args = list(argv)
    as_words = "--text" in args
    args = [a for a in args if a != "--text"]
    try:
        if len(args) == 2 and args[0] == "--file":
            with open(args[1], encoding="utf-8") as f:
                data = json.load(f)
        elif len(args) == 1:
            data = json.loads(args[0])
        else:
            print(__doc__)
            return 2
    except (OSError, ValueError):
        print("Fix this first: the input is not a JSON file or JSON text that can be read." if as_words
              else json.dumps({"ok": False, "problems": [{"field": "input", "kind": "bad",
                                                          "message": "The input could not be read as JSON."}]}))
        return 1
    result = build_briefing(data)
    sys.stdout.write(to_words(result) if as_words else json.dumps(result, ensure_ascii=False) + "\n")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
