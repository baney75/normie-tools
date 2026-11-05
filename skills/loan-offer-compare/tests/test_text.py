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
    def test_two_offers_key_lines(self):
        case = next(c for c in GOLDEN["cases"] if c["id"] == "two-offers")
        code, lines = run_text(case["input"])
        self.assertEqual(code, 0)
        for want in (
            "Offer 1 monthly payment: $304.22",
            "Offer 1 total paid: $10,951.88",
            "Offer 1 yearly interest rate: 6%",
            "Offer 1 loan length: 36 months (3 years)",
            "Offer 1 cost of borrowing: $951.88 (interest plus upfront fees)",
            "Offer 2 monthly payment: $230.29",
            "Offer 2 upfront fees: $200.00",
            "Offer 2 cost of borrowing: $1,254.11 (interest plus upfront fees)",
            "Lowest cost of borrowing: Offer 1.",
            "Lowest monthly payment: Offer 2.",
            "These offers differ in amount or length. Their totals are for different loans.",
        ):
            self.assertIn(want, lines)
        self.assertEqual(lines[-1], END)

    def test_three_offers_name_every_offer(self):
        case = next(c for c in GOLDEN["cases"] if c["id"] == "three-offers")
        _code, lines = run_text(case["input"])
        self.assertEqual(sum(1 for l in lines if l.endswith("(interest plus upfront fees)")), 3)
        self.assertEqual(sum(1 for l in lines if " monthly payment: $" in l), 3)

    def test_ties_name_every_tied_offer(self):
        case = next(c for c in GOLDEN["cases"] if c["id"] == "tie-identical")
        _code, lines = run_text(case["input"])
        self.assertIn("These offers tie on cost of borrowing: Offer 1 and Offer 2.", lines)
        self.assertIn("These offers tie on monthly payment: Offer 1 and Offer 2.", lines)
        self.assertNotIn("These offers differ in amount or length. Their totals are for different loans.", lines)

    def test_problem_text_names_the_offer(self):
        code, lines = run_text({"offers": [{"amount": "8,000", "rate": "6.555", "term": "24", "termUnit": "months"},
                                           {"amount": "8,000", "rate": "5", "term": ""}]})
        self.assertEqual(code, 1)
        self.assertEqual(lines, [
            "Fix this first: Offer 1: Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
            "Fix this first: Offer 2: Type how long the loan lasts.",
        ])

    def test_percent_and_money_words(self):
        self.assertEqual(calc.percent_text(725), "7.25%")
        self.assertEqual(calc.percent_text(650), "6.5%")
        self.assertEqual(calc.percent_text(0), "0%")
        self.assertEqual(calc.money_text(1095188), "$10,951.88")
        self.assertEqual(calc.money_text(30422), "$304.22")
        self.assertEqual(calc.money_text(5), "$0.05")

    def test_json_without_flag_is_unchanged(self):
        for data in [c["input"] for c in GOLDEN["cases"]]:
            _code, raw = run_json(data)
            self.assertEqual(raw, json.dumps(calc.compare_offers(data), indent=1) + "\n")

    def test_every_error_case_starts_with_fix_this_first(self):
        for e in GOLDEN["errors"]:
            code, lines = run_text(e["input"])
            self.assertEqual(code, 1, e["id"])
            self.assertEqual(len(lines), len(calc.compare_offers(e["input"])["problems"]), e["id"])
            for line in lines:
                self.assertTrue(line.startswith("Fix this first: "), (e["id"], line))

    def test_unreadable_json_is_plain_words(self):
        out = subprocess.run([sys.executable, SCRIPT, "not json", "--text"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 1)
        self.assertTrue(out.stdout.startswith("Fix this first: "))

    def test_no_dashes_or_cent_fields_in_text(self):
        for data in [c["input"] for c in GOLDEN["cases"]]:
            _code, lines = run_text(data)
            blob = "\n".join(lines)
            self.assertNotIn("\u2014", blob)
            self.assertNotIn("\u2013", blob)
            self.assertNotIn("Cents", blob)
            self.assertNotIn("{", blob)


if __name__ == "__main__":
    unittest.main()
