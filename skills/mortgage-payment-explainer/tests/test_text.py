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
    def test_basic_key_lines(self):
        case = next(c for c in GOLDEN["mortgages"] if c["id"] == "basic-30y")
        code, lines = run_text(case["input"])
        self.assertEqual(code, 0)
        for want in (
            "Total monthly payment: $1,888.92",
            "Loan amount: $240,000.00",
            "Yearly interest rate: 6%",
            "Loan length: 360 months (30 years)",
            "Principal and interest: $1,438.92",
            "Property tax each month: $300.00",
            "Home insurance each month: $100.00",
            "HOA each month: $50.00",
            "Mortgage insurance each month: $0.00",
            "Total interest over the loan: $278,012.58",
            "Your first payment goes to interest: $1,200.00",
            "Your first payment lowers what you owe: $238.92",
        ):
            self.assertIn(want, lines)
        self.assertEqual(lines[0], "Total monthly payment: $1,888.92")
        self.assertEqual(lines[-1], END)

    def test_mortgage_insurance_and_odd_rate(self):
        case = next(c for c in GOLDEN["mortgages"] if c["id"] == "with-mortgage-insurance")
        _code, lines = run_text(case["input"])
        self.assertIn("Yearly interest rate: 7.25%", lines)
        self.assertIn("Mortgage insurance each month: $95.10", lines)
        self.assertIn("Total monthly payment: $2,737.38", lines)

    def test_zero_rate_and_one_year(self):
        case = next(c for c in GOLDEN["mortgages"] if c["id"] == "zero-rate-20y")
        r = calc.explain_mortgage(case["input"])
        _code, lines = run_text(case["input"])
        self.assertIn("Yearly interest rate: 0%", lines)
        self.assertIn("Total interest over the loan: $0.00", lines)
        self.assertIn("Loan length: 240 months (20 years)", lines)
        self.assertIn("Total monthly payment: " + calc.money_text(r["totalMonthlyCents"]), lines)
        case = next(c for c in GOLDEN["mortgages"] if c["id"] == "one-year")
        _code, lines = run_text(case["input"])
        self.assertIn("Loan length: 12 months (1 year)", lines)

    def test_problem_text(self):
        code, lines = run_text({"price": "300,000", "down": "60,000", "rate": "6.555", "term": "30"})
        self.assertEqual(code, 1)
        self.assertEqual(lines, ["Fix this first: Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most."])

    def test_money_words(self):
        self.assertEqual(calc.money_text(23750000), "$237,500.00")
        self.assertEqual(calc.money_text(216805), "$2,168.05")

    def test_json_without_flag_is_unchanged(self):
        for data in [c["input"] for c in GOLDEN["mortgages"]]:
            _code, raw = run_json(data)
            self.assertEqual(raw, json.dumps(calc.explain_mortgage(data), indent=1) + "\n")

    def test_every_error_case_starts_with_fix_this_first(self):
        for e in GOLDEN["errors"]:
            code, lines = run_text(e["input"])
            self.assertEqual(code, 1, e["id"])
            self.assertEqual(len(lines), len(calc.explain_mortgage(e["input"])["problems"]), e["id"])
            for line in lines:
                self.assertTrue(line.startswith("Fix this first: "), (e["id"], line))

    def test_unreadable_json_is_plain_words(self):
        out = subprocess.run([sys.executable, SCRIPT, "not json", "--text"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 1)
        self.assertTrue(out.stdout.startswith("Fix this first: "))

    def test_no_dashes_or_cent_fields_in_text(self):
        for data in [c["input"] for c in GOLDEN["mortgages"]]:
            _code, lines = run_text(data)
            blob = "\n".join(lines)
            self.assertNotIn("\u2014", blob)
            self.assertNotIn("\u2013", blob)
            self.assertNotIn("Cents", blob)
            self.assertNotIn("{", blob)


if __name__ == "__main__":
    unittest.main()
