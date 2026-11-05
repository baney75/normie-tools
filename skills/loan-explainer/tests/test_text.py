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
     ["Your monthly payment is $304.22, every month for the whole loan.", "The total you pay is $10,951.88.",
      "The total interest is $951.88.", "The cost of borrowing is $951.88. That is interest plus upfront fees."]),
    ("home", {"amount": "20,000", "rate": "7.25%", "term": "5", "termUnit": "years", "fees": "500", "extra": "100"},
     ["The upfront fees are $500.00, and they are not in the total you pay.", "The total interest is $3,903.20.",
      "The cost of borrowing is $4,403.20. That is interest plus upfront fees.",
      "With your extra $100.00 each month, your monthly payment is $498.39.",
      "You pay it off after 47 months, which is 13 months sooner.",
      "Your total interest with the extra is $2,974.16, so you save $929.04 in interest."]),
    ("zero", {"amount": "6,000", "rate": "0", "term": "24", "termUnit": "months", "extra": "50"},
     ["Your monthly payment is $250.00, every month for the whole loan.", "The total interest is $0.00.",
      "You pay it off after 20 months, which is 4 months sooner.",
      "Your total interest with the extra is $0.00, so you save $0.00 in interest."]),
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

    def test_car_text_is_short_and_ends_with_apr_then_estimate(self):
        got, _ = lines(CASES[0][1])
        self.assertEqual(len(got), 6)
        self.assertEqual(got[-2], "This does not work out the APR. The paper from your lender shows the APR.")

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
