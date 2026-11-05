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
    ("car", {"amount": "$10,000", "rate": "6", "term": "36", "termUnit": "months", "fees": "", "extra": ""},
     ["Amount borrowed: $10,000.00", "Yearly interest rate: 6%", "Loan length: 36 months (3 years)",
      "Monthly payment: $304.22. Each month for the whole loan.", "Total paid: $10,951.88",
      "Total interest: $951.88"]),
    ("home", {"amount": "20,000", "rate": "7.25%", "term": "5", "termUnit": "years", "fees": "500", "extra": "100"},
     ["Yearly interest rate: 7.25%", "Upfront fees: $500.00", "Total interest: $3,903.20",
      "Cost of borrowing: $4,403.20. This is interest plus upfront fees.",
      "Months saved: 13 months", "Interest saved: $929.04", "Paid off after: 47 months"]),
    ("zero", {"amount": "6,000", "rate": "0", "term": "24", "termUnit": "months", "extra": "50"},
     ["Monthly payment: $250.00. Each month for the whole loan.", "Total interest: $0.00", "Paid off after: 20 months",
      "Months saved: 4 months", "Interest saved: $0.00"]),
]

BAD = {"amount": "8,000", "rate": "5", "term": "2.5", "termUnit": "years"}


class TextOutput(unittest.TestCase):
    def test_json_form_is_unchanged(self):
        r = run(CASES[0][1])
        self.assertEqual(r.stdout, json.dumps(calc.explain_loan(CASES[0][1]), indent=1) + "\n")

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
