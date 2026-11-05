import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "scripts", "calc.py")
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402

ENDING = 'This is an estimate from the numbers you typed. The paper from your bank or lender has the final word.'


def run(data, *flags):
    return subprocess.run([sys.executable, SCRIPT, json.dumps(data), *flags], capture_output=True, text=True)


def lines(data):
    r = run(data, "--text")
    return r.stdout.splitlines(), r.returncode


CASES = [
    ("when", {"mode": "when", "goal": "$5,000", "saved": "500", "monthly": "250", "rate": "0", "start": "2026-12"},
     ["Your goal takes 18 months (1 year 6 months).", "You reach your goal in May 2028.",
      "The total you add is $4,500.00.", "The interest earned is $0.00.", "The amount saved at the end is $5,000.00."]),
    ("by", {"mode": "by", "goal": "10,000", "saved": "500", "rate": "5", "start": "2026-01", "target": "2027-12"},
     ["The smallest amount to save each month is $375.12.", "That is 24 months, from January 2026 to December 2027.",
      "The interest earned is $497.33."]),
    ("messy", {"mode": "when", "goal": "12,000", "saved": "1,250.50", "monthly": "300", "rate": "4.5%", "start": "2026-12"},
     ["Your goal takes 34 months (2 years 10 months).", "You reach your goal in September 2029.",
      "The amount saved at the end is $12,277.36.", "The interest earned is $826.86."]),
    ("never", {"mode": "when", "goal": "2,000", "saved": "300", "monthly": "0", "rate": "0"},
     ["Your savings stay at $300.00."]),
    ("reached", {"mode": "when", "goal": "1,500", "saved": "1,800", "monthly": "100", "start": "2026-12"},
     ["Your goal takes 0 months.", "You have saved $1,800.00. The goal is $1,500.00."]),
]

BAD = {"mode": "when", "goal": "3,000", "saved": "200", "monthly": "150", "start": "Dec 2026"}


class TextOutput(unittest.TestCase):
    def test_json_form_is_unchanged(self):
        r = run(CASES[0][1])
        self.assertEqual(r.stdout, json.dumps(calc.explain_savings(CASES[0][1]), indent=1) + "\n")

    def test_text_cases(self):
        for name, data, want in CASES:
            got, code = lines(data)
            self.assertEqual(code, 0, name)
            for w in want:
                self.assertIn(w, got, name)
            self.assertEqual(got[-1], ENDING, name)
            self.assertNotIn("{", "".join(got), name)
            self.assertNotIn("Cents", "".join(got), name)

    def test_problems_read_as_fix_this_first(self):
        got, code = lines(BAD)
        self.assertEqual(code, 1)
        self.assertTrue(got)
        for l in got:
            self.assertTrue(l.startswith("Fix this first: "), l)

    def test_text_matches_between_flag_positions(self):
        a = subprocess.run([sys.executable, SCRIPT, "--text", json.dumps(CASES[0][1])], capture_output=True, text=True)
        self.assertEqual(a.stdout, run(CASES[0][1], "--text").stdout)


if __name__ == "__main__":
    unittest.main()
