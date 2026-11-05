import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "savings-goal-tracker", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


def strip_ok(r):
    return {k: v for k, v in r.items() if k != "ok"}


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_months_to_goal_match_the_javascript_answers(self):
        for c in GOLDEN["when"]:
            r = calc.explain_savings(c["input"])
            self.assertTrue(r["ok"], c["id"])
            self.assertEqual(strip_ok(r), c["expect"], c["id"])

    def test_monthly_needed_match_the_javascript_answers(self):
        for c in GOLDEN["by"]:
            r = calc.explain_savings(c["input"])
            self.assertTrue(r["ok"], c["id"])
            self.assertEqual(strip_ok(r), c["expect"], c["id"])

    def test_bad_entries_name_the_field(self):
        for e in GOLDEN["errors"]:
            r = calc.explain_savings(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    base = {"mode": "when", "goal": "5000", "saved": "500", "monthly": "250", "rate": "4", "start": "2026-12"}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                "2026-13", "2026-1", None, 5, 1.5, float("nan"), True, [], {}]
        for field in ("goal", "saved", "monthly", "rate", "start", "target"):
            for j in junk:
                inp = dict(self.base)
                inp[field] = j
                r = calc.explain_savings(inp)
                self.assertIn("ok", r)
                blob = json.dumps(r)
                self.assertNotIn("NaN", blob)
                self.assertNotIn("Infinity", blob)

    def test_non_dict_input(self):
        for x in (None, [], "text", 5):
            self.assertFalse(calc.explain_savings(x)["ok"])

    def test_edges(self):
        self.assertEqual(calc.explain_savings({"goal": "1200", "monthly": "1"})["months"], 1200)
        self.assertEqual(calc.explain_savings({"goal": "1201", "monthly": "1"})["status"], "too-long")
        self.assertEqual(calc.explain_savings({"goal": "100", "saved": "100", "monthly": "0"})["status"], "reached")
        self.assertEqual(calc.explain_savings({"goal": "100", "monthly": "0"})["status"], "no-savings")

    def test_rounding_half_up(self):
        self.assertEqual(calc.div_round_half_up(1, 2), 1)
        self.assertEqual(calc.div_round_half_up(49, 100), 0)
        self.assertEqual(calc.div_round_half_up(60000, 120000), 1)

    def test_cli(self):
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        out = subprocess.run([sys.executable, script, json.dumps(self.base)], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["status"], "will-reach")
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)


if __name__ == "__main__":
    unittest.main()
