import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "scripts", "briefing.py")
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import briefing  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "morning-briefing", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


def run(*args):
    return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True)


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_times(self):
        for t in GOLDEN["times"]:
            self.assertEqual(briefing.parse_time(t["text"]), t["minutes"], t["text"])
        for c in GOLDEN["clockWords"]:
            self.assertEqual(briefing.format_time(c["minutes"]), c["text"])

    def test_dates(self):
        for d in GOLDEN["dates"]:
            self.assertEqual(briefing.format_date(d["input"]), d["text"], d["input"])

    def test_briefings_match_the_javascript_text(self):
        for b in GOLDEN["briefings"]:
            r = briefing.build_briefing(b["input"])
            self.assertTrue(r["ok"], b["id"])
            self.assertEqual(r["text"], b["text"], b["id"])

    def test_errors_name_the_field(self):
        for e in GOLDEN["errors"]:
            r = briefing.build_briefing(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([p["field"] for p in r["problems"]], e["fields"], e["id"])


class Messy(unittest.TestCase):
    def test_messy_values_never_raise(self):
        junk = ["", " ", "1e3", "-5", "lots", "\U0001F600", "NaN", "a" * 5000, None, 5, 1.5, float("nan"), True, [], {}]
        for j in junk:
            r = briefing.build_briefing({"include": {"day": True, "reminders": True}, "day": [{"time": j, "title": j}],
                                         "reminders": [j]})
            self.assertTrue(r["ok"])
            self.assertNotIn("Infinity", r["text"])
            self.assertNotIn("None", r["text"])
        for x in (None, [], "x", 5, {"include": "yes"}):
            self.assertFalse(briefing.build_briefing(x)["ok"])

    def test_caps(self):
        r = briefing.build_briefing({"include": {"day": True}, "day": [{"time": "%dam" % (i + 1), "title": "T"} for i in range(9)]})
        self.assertEqual(len(r["sections"][0]["lines"]), 5)
        self.assertIn("4 left out", r["notes"][0])


class Words(unittest.TestCase):
    def test_text_flag_prints_plain_lines_and_a_final_note(self):
        out = run("--file", os.path.join(HERE, "..", "examples", "full-morning.json"), "--text")
        self.assertEqual(out.returncode, 0, out.stderr)
        lines = out.stdout.splitlines()
        self.assertEqual(lines[0], "Morning briefing")
        self.assertIn("7:30 am: Take pills", lines)
        self.assertLess(lines.index("7:30 am: Take pills"), lines.index("1:00 pm: Lunch with Pat"))
        self.assertIn("- later: Call Sam", lines)
        self.assertIn("Example. Not today's weather.", lines)
        self.assertTrue(lines[-1].startswith("Note: "))
        self.assertNotIn("", lines)
        self.assertNotIn("{", out.stdout)

    def test_text_without_example_parts_has_the_plain_note(self):
        out = run("--file", os.path.join(HERE, "..", "examples", "my-own-only.json"), "--text")
        self.assertEqual(out.returncode, 0)
        self.assertNotIn("Example", out.stdout)
        self.assertEqual(out.stdout.splitlines()[-1], briefing.NOTE_PLAIN)

    def test_text_problems_start_with_fix_this_first(self):
        out = run(json.dumps({"include": {}, "date": "soon"}), "--text")
        self.assertEqual(out.returncode, 1)
        lines = out.stdout.splitlines()
        self.assertEqual([l.startswith("Fix this first: ") for l in lines[:-1]], [True, True])
        self.assertTrue(lines[-1].startswith("Note: "))

    def test_text_for_unreadable_input(self):
        out = run("not json", "--text")
        self.assertEqual(out.returncode, 1)
        self.assertTrue(out.stdout.startswith("Fix this first: "))

    def test_json_stays_json(self):
        out = run(json.dumps({"include": {"reminders": True}, "reminders": ["Call Sam"]}))
        self.assertEqual(out.returncode, 0)
        self.assertEqual(json.loads(out.stdout)["text"], "Morning briefing\n\nMy reminders\n- Call Sam\n")
        bad = run("not json")
        self.assertEqual(bad.returncode, 1)
        self.assertFalse(json.loads(bad.stdout)["ok"])

    def test_no_clock_or_network_use(self):
        with open(SCRIPT, encoding="utf-8") as f:
            src = f.read()
        for word in ("import socket", "urllib", "requests", "datetime.now", "date.today", "time.time"):
            self.assertNotIn(word, src)


if __name__ == "__main__":
    unittest.main()
