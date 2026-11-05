import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402

SCRIPT = os.path.join(HERE, "..", "scripts", "calc.py")
END = "This is an estimate from the numbers you typed. The paper from your bank or lender has the final word."
with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
    GOLDEN = json.load(f)


def run_text(data):
    out = subprocess.run([sys.executable, SCRIPT, json.dumps(data), "--text"], capture_output=True, text=True)
    return out.returncode, out.stdout.splitlines()


def run_json(data):
    out = subprocess.run([sys.executable, SCRIPT, json.dumps(data)], capture_output=True, text=True)
    return out.returncode, out.stdout


class Text(unittest.TestCase):
    ADDED = {"balance": "$20,000", "rate": "5", "waitMonths": "6", "capitalize": True, "payment": "300",
             "start": "2026-09", "years": "10"}

    def test_added_to_balance_key_lines(self):
        code, lines = run_text(self.ADDED)
        self.assertEqual(code, 0)
        for want in (
            "Loan balance: $20,000.00",
            "Yearly interest rate: 5%",
            "Months with no payments so far: 6 months",
            "Add the unpaid interest to my balance: yes",
            "Balance when payments start: $20,499.98",
            "Interest that grew while you waited: $499.98",
            "Monthly payment: $300.00",
            "Months to pay off: 81 months (6 years and 9 months)",
            "Total interest: $4,176.47",
            "Payoff month: May 2033",
            "Smallest payment to finish in 10 years: $217.44",
        ):
            self.assertIn(want, lines)
        self.assertEqual(lines[-1], END)

    def test_not_added_changes_the_numbers(self):
        _code, lines = run_text(dict(self.ADDED, capitalize=False))
        self.assertIn("Add the unpaid interest to my balance: no", lines)
        self.assertIn("Total interest: $4,171.44", lines)
        self.assertIn("Smallest payment to finish in 10 years: $217.39", lines)

    def test_balance_only_has_no_payoff_lines(self):
        _code, lines = run_text({"balance": "10,000", "rate": "4.5", "waitMonths": "12"})
        self.assertTrue(any(l.startswith("Balance when payments start: $") for l in lines))
        self.assertFalse(any(l.startswith(("Months to pay off", "Payoff month", "Smallest payment")) for l in lines))
        self.assertEqual(lines[-1], END)

    def test_one_year_wording(self):
        _code, lines = run_text({"balance": "1,200", "rate": "0", "years": "1"})
        self.assertIn("Smallest payment to finish in 1 year: $100.00", lines)

    def test_problem_text(self):
        code, lines = run_text({"balance": "20,000", "rate": "5", "payment": "50"})
        self.assertEqual(code, 1)
        self.assertEqual(len(lines), 1)
        self.assertTrue(lines[0].startswith("Fix this first: Monthly payment: "))

    def test_months_words(self):
        self.assertEqual(calc.months_text(1), "1 month")
        self.assertEqual(calc.months_text(11), "11 months")
        self.assertEqual(calc.months_text(12), "12 months (1 year)")
        self.assertEqual(calc.months_text(81), "81 months (6 years and 9 months)")

    def test_json_without_flag_is_unchanged(self):
        for data in [c["input"] for c in GOLDEN["loans"]]:
            _code, raw = run_json(data)
            self.assertEqual(raw, json.dumps(calc.explain_student_loan(data), indent=1) + "\n")

    def test_every_error_case_starts_with_fix_this_first(self):
        for e in GOLDEN["errors"]:
            code, lines = run_text(e["input"])
            self.assertEqual(code, 1, e["id"])
            self.assertEqual(len(lines), len(calc.explain_student_loan(e["input"])["problems"]), e["id"])
            for line in lines:
                self.assertTrue(line.startswith("Fix this first: "), (e["id"], line))

    def test_unreadable_json_is_plain_words(self):
        out = subprocess.run([sys.executable, SCRIPT, "not json", "--text"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 1)
        self.assertTrue(out.stdout.startswith("Fix this first: "))

    def test_no_dashes_or_cent_fields_in_text(self):
        for data in [c["input"] for c in GOLDEN["loans"]]:
            _code, lines = run_text(data)
            blob = "\n".join(lines)
            self.assertNotIn("\u2014", blob)
            self.assertNotIn("\u2013", blob)
            self.assertNotIn("Cents", blob)
            self.assertNotIn("{", blob)


if __name__ == "__main__":
    unittest.main()
