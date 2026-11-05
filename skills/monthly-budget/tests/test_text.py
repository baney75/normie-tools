import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "scripts", "calc.py")
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402

ENDING = 'This adds up the numbers you typed. It does not tell you what to do.'


def run(data, *flags):
    return subprocess.run([sys.executable, SCRIPT, json.dumps(data), *flags], capture_output=True, text=True)


def lines(data):
    r = run(data, "--text")
    return r.stdout.splitlines(), r.returncode


CASES = [
    ("starter", {"income": [{"name": "Pay", "amount": "3,000"}],
                 "expenses": [{"name": "Rent or mortgage", "amount": "1,200"}, {"name": "Food", "amount": "450"},
                              {"name": "Bills", "amount": "300"}, {"name": "Transport", "amount": "250"},
                              {"name": "Other", "amount": "100"}]},
     ["Total income: $3,000.00", "Total spending: $2,300.00", "Left over: $700.00. This is money in that is not spent.",
      "Percent of income spent: 77%", "Spending, Rent or mortgage: $1,200.00, 40% of income, 52% of spending"]),
    ("short", {"income": [{"name": "Pay", "amount": "1,000"}, {"name": "Side job", "amount": "250.50"}],
               "expenses": [{"name": "Rent", "amount": "1,100"}, {"name": "Food", "amount": "400.25"}]},
     ["Total income: $1,250.50", "Total spending: $1,500.25", "More goes out than comes in. The gap is $249.75.",
      "Spending, Rent: $1,100.00, 88% of income, 73% of spending"]),
    ("no income", {"income": [{"name": "Pay", "amount": ""}],
                   "expenses": [{"name": "Rent", "amount": "900"}, {"name": "Food", "amount": "300"}]},
     ["There is no income, so there are no percents of income.", "Spending, Rent: $900.00, 75% of spending"]),
]

BAD = {"income": [{"name": "Pay", "amount": "2,400"}], "expenses": [{"name": "Food", "amount": "410.255"}]}


class TextOutput(unittest.TestCase):
    def test_json_form_is_unchanged(self):
        r = run(CASES[0][1])
        self.assertEqual(r.stdout, json.dumps(calc.plan_budget(CASES[0][1]), indent=1) + "\n")

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
