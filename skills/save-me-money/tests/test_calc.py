import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "save-me-money", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_money_text(self):
        for c in GOLDEN["money"]:
            self.assertEqual(calc.parse_money(c["text"]), c["cents"], c["text"])

    def test_plans_match_the_javascript_answers(self):
        for c in GOLDEN["plans"]:
            r = calc.list_costs(c["input"])
            self.assertTrue(r["ok"], c["id"])
            r = {k: v for k, v in r.items() if k != "ok"}
            self.assertEqual(r, c["expect"], c["id"])

    def test_bad_entries_name_the_line(self):
        for e in GOLDEN["errors"]:
            r = calc.list_costs(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), float("inf"), True, [], {}]
        for j in junk:
            r = calc.list_costs({"items": [{"name": "Phone", "amount": j, "every": "month"}]})
            self.assertIn("ok", r)
            blob = json.dumps(r)
            self.assertNotIn("NaN", blob)
            self.assertNotIn("Infinity", blob)

    def test_messy_how_often(self):
        for e in ["week", " Week ", "YEAR", "", "day", None, 5, {}]:
            r = calc.list_costs({"items": [{"name": "Phone", "amount": "10", "every": e}]})
            self.assertIn("ok", r)

    def test_non_dict_input(self):
        for x in (None, [], "text", 5, {"items": "x"}):
            self.assertFalse(calc.list_costs(x)["ok"])

    def test_odd_lines_are_empty_lines(self):
        r = calc.list_costs({"items": [None, 5, [], {"name": "Water", "amount": "10", "every": "month"}]})
        self.assertTrue(r["ok"])
        self.assertEqual(r["yearlyCents"], 12000)

    def test_limits(self):
        many = [{"name": f"L{i}", "amount": "1", "every": "year"} for i in range(calc.MAX_ROWS)]
        self.assertTrue(calc.list_costs({"items": many})["ok"])
        self.assertFalse(calc.list_costs({"items": many + [many[0]]})["ok"])
        long = calc.list_costs({"items": [{"name": "A" * 500, "amount": "1", "every": "year"}]})
        self.assertEqual(len(long["rows"][0]["name"]), 60)

    def test_questions_are_generic(self):
        for q in calc.QUESTIONS:
            self.assertTrue(q.endswith("?"))
            self.assertFalse(any(ch in q for ch in "0123456789$%"))

    def test_format_money(self):
        self.assertEqual(calc.format_money(395188), "$3,951.88")

    def test_cli(self):
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        data = {"items": [{"name": "Phone", "amount": "65", "every": "month"}]}
        out = subprocess.run([sys.executable, script, json.dumps(data)], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["yearlyCents"], 78000)
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)


class PlainText(unittest.TestCase):
    def test_good_text(self):
        r = calc.list_costs(GOLDEN["plans"][0]["input"])
        lines = calc.to_text(r).split("\n")
        self.assertEqual(lines[0], "Your 6 costs come to $3,951.88 a year.")
        self.assertEqual(lines[1], "That is $329.32 a month.")
        self.assertEqual(lines[2], "Insurance is the biggest: $1,200.00 a year, $100.00 a month.")
        self.assertEqual(lines[5], "Gym: $520.00 a year, $43.33 a month.")
        self.assertLessEqual(len(lines), 10)
        self.assertTrue(lines[-1].startswith("Note:"))
        self.assertIn("52 weeks", lines[-1])
        self.assertTrue(lines[-2].startswith("Questions to ask before you call"))
        self.assertIn("What is the price today?", lines[-2])

    def test_no_raw_codes(self):
        for c in GOLDEN["plans"]:
            text = calc.to_text(calc.list_costs(c["input"]))
            for bad in ("{", "}", "Cents", "cents", "None", "NaN", "null", "true", "false"):
                self.assertNotIn(bad, text, c["id"])

    def test_empty_text(self):
        text = calc.to_text(calc.list_costs({"items": [{"name": "Phone", "amount": "", "every": "month"}]}))
        self.assertTrue(text.startswith("Nothing to add up yet."))
        self.assertTrue(text.split("\n")[-1].startswith("Note:"))

    def test_problem_text(self):
        for e in GOLDEN["errors"]:
            lines = calc.to_text(calc.list_costs(e["input"])).split("\n")
            self.assertEqual(len(lines), len(e["errors"]) + 1, e["id"])
            for line in lines[:-1]:
                self.assertTrue(line.startswith("Fix this first: "), line)
            self.assertTrue(lines[-1].startswith("Note:"))

    def test_text_flag_cli(self):
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        data = json.dumps({"items": [{"name": "Phone", "amount": "65", "every": "month"}]})
        out = subprocess.run([sys.executable, script, "--text", data], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue(out.stdout.startswith("Your 1 cost comes to $780.00 a year."))
        bad = subprocess.run([sys.executable, script, "--text", '{"items":[{"name":"A","amount":"x","every":"week"}]}'],
                             capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)
        self.assertTrue(bad.stdout.startswith("Fix this first: A:"))


if __name__ == "__main__":
    unittest.main()
