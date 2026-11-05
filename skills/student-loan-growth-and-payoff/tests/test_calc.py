import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402

TOOL = "student-loan-growth-and-payoff"


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", TOOL, "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        copy = os.path.join(HERE, "golden.json")
        with open(copy, encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_money_text(self):
        for c in GOLDEN["money"]:
            self.assertEqual(calc.parse_money(c["text"]), c["cents"], c["text"])

    def test_rate_text(self):
        for c in GOLDEN["rate"]:
            self.assertEqual(calc.parse_rate(c["text"]), c["bps"], c["text"])

    def test_loans_match_the_javascript_answers(self):
        for c in GOLDEN["loans"]:
            r = calc.explain_student_loan(c["input"])
            self.assertTrue(r["ok"], c["id"])
            e = c["expect"]
            for k in ("monthlyInterestCents", "unpaidInterestCents", "balanceAtStartCents", "payoff"):
                self.assertEqual(r[k], e[k], "%s %s" % (c["id"], k))
            if e["minPayment"] is None:
                self.assertIsNone(r["minPayment"], c["id"])
            else:
                want = {k: e["minPayment"][k] for k in ("years", "months", "paymentCents")}
                self.assertEqual(r["minPayment"], want, c["id"])

    def test_bad_entries_name_the_field(self):
        for e in GOLDEN["errors"]:
            r = calc.explain_student_loan(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    base = {"balance": "20000", "rate": "5", "waitMonths": "6", "capitalize": False, "payment": "300",
            "start": "2026-09", "years": "10"}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), True, [], {}, "2026-1", "0000-00"]
        for field in ("balance", "rate", "waitMonths", "payment", "start", "years", "capitalize"):
            for j in junk:
                inp = dict(self.base)
                inp[field] = j
                r = calc.explain_student_loan(inp)
                self.assertIn("ok", r)
                blob = json.dumps(r)
                self.assertNotIn("NaN", blob)
                self.assertNotIn("Infinity", blob)

    def test_non_dict_input(self):
        for x in (None, [], "text", 5):
            self.assertFalse(calc.explain_student_loan(x)["ok"])

    def test_edges(self):
        self.assertTrue(calc.explain_student_loan(dict(self.base, rate="0"))["ok"])
        self.assertTrue(calc.explain_student_loan(dict(self.base, waitMonths="0"))["ok"])
        self.assertTrue(calc.explain_student_loan(dict(self.base, years="100"))["ok"])
        self.assertFalse(calc.explain_student_loan(dict(self.base, years="101"))["ok"])
        self.assertFalse(calc.explain_student_loan(dict(self.base, waitMonths="601"))["ok"])
        self.assertFalse(calc.explain_student_loan(dict(self.base, payment="0.01"))["ok"])

    def test_balance_only(self):
        r = calc.explain_student_loan({"balance": "5000", "rate": "4.5"})
        self.assertTrue(r["ok"])
        self.assertIsNone(r["payoff"])
        self.assertEqual(r["balanceAtStartCents"], 500000)

    def test_add_months_rolls_the_year(self):
        self.assertEqual(calc.add_months(2026, 12, 1)["label"], "January 2027")

    def test_cli(self):
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        out = subprocess.run([sys.executable, script, json.dumps(self.base)], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["balanceAtStartCents"], 2049998)
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)


if __name__ == "__main__":
    unittest.main()
