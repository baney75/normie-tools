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
    ("followup", {"debts": [{"name": "Card A", "balance": "500", "rate": "18", "minimum": "25"},
                            {"name": "Card B", "balance": "2,500", "rate": "22.99", "minimum": "60"}], "extra": "100"},
     ["Money each month: $185.00", "Snowball, Months to debt-free: 20 months", "Snowball, Total interest: $619.69",
      "Avalanche, Total interest: $594.41", "Avalanche, Total paid: $3,594.41",
      "Snowball, Order of payoff: Card A is paid off in month 5.",
      "Avalanche, Order of payoff: Card B is paid off in month 19.",
      "Both plans take the same number of months.", "Avalanche pays $25.28 less interest than Snowball.",
      "Card B: balance $2,500.00, yearly rate 22.99%, smallest payment $60.00"]),
    ("two", {"debts": [{"name": "Store card", "balance": "1,200", "rate": "24.99", "minimum": "45"},
                       {"name": "Family loan", "balance": "3,000", "rate": "0", "minimum": "150"}]},
     ["Snowball, Months to debt-free: 24 months", "Snowball, Total interest: $446.08",
      "Avalanche, Total interest: $446.08", "Both plans pay the same interest.",
      "Snowball, Order of payoff: Family loan is paid off in month 20."]),
]

BAD = {"debts": [{"name": "Big", "balance": "10,000", "rate": "24", "minimum": "150"}]}


class TextOutput(unittest.TestCase):
    def test_json_form_is_unchanged(self):
        r = run(CASES[0][1])
        self.assertEqual(r.stdout, json.dumps(calc.plan_debt_payoff(CASES[0][1]), indent=2) + "\n")

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
