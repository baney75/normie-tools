import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402

BODY_KEYS = ["priceCents", "downCents", "loanCents", "rateBps", "months", "piCents", "taxMonthCents",
             "insuranceMonthCents", "hoaCents", "pmiCents", "totalMonthlyCents", "totalInterestCents",
             "firstInterestCents", "firstPrincipalCents"]


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "mortgage-payment-explainer", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_money_text(self):
        for c in GOLDEN["money"]:
            self.assertEqual(calc.parse_money(c["text"]), c["cents"], c["text"])

    def test_rate_text(self):
        for c in GOLDEN["rate"]:
            self.assertEqual(calc.parse_rate(c["text"]), c["bps"], c["text"])

    def test_mortgages_match_the_javascript_answers(self):
        for c in GOLDEN["mortgages"]:
            r = calc.explain_mortgage(c["input"])
            self.assertTrue(r["ok"], c["id"])
            self.assertEqual({k: v for k, v in r.items() if k != "ok"}, c["expect"], c["id"])

    def test_parts_add_up(self):
        for c in GOLDEN["mortgages"]:
            r = calc.explain_mortgage(c["input"])
            self.assertEqual(r["totalMonthlyCents"], r["piCents"] + r["taxMonthCents"] + r["insuranceMonthCents"]
                             + r["hoaCents"] + r["pmiCents"], c["id"])
            self.assertEqual(r["firstInterestCents"] + r["firstPrincipalCents"], r["piCents"], c["id"])

    def test_bad_entries_name_the_field(self):
        for e in GOLDEN["errors"]:
            r = calc.explain_mortgage(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    base = {"price": "300000", "down": "60000", "rate": "6", "term": "30", "tax": "", "insurance": "", "hoa": "", "pmi": ""}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), True, [], {}]
        for field in self.base:
            for j in junk:
                inp = dict(self.base)
                inp[field] = j
                r = calc.explain_mortgage(inp)
                self.assertIn("ok", r)
                blob = json.dumps(r)
                self.assertNotIn("NaN", blob)
                self.assertNotIn("Infinity", blob)

    def test_non_dict_input(self):
        for x in (None, [], "text", 5):
            self.assertFalse(calc.explain_mortgage(x)["ok"])

    def test_edges(self):
        self.assertTrue(calc.explain_mortgage(dict(self.base, rate="0"))["ok"])
        self.assertTrue(calc.explain_mortgage(dict(self.base, term="1"))["ok"])
        self.assertTrue(calc.explain_mortgage(dict(self.base, term="100"))["ok"])
        self.assertFalse(calc.explain_mortgage(dict(self.base, term="101"))["ok"])
        self.assertFalse(calc.explain_mortgage(dict(self.base, down="300000"))["ok"])

    def test_rounding_half_up(self):
        self.assertEqual(calc.div_round_half_up(1, 2), 1)
        self.assertEqual(calc.div_round_half_up(10002, 12), 834)

    def test_cli(self):
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        good = subprocess.run([sys.executable, script, json.dumps(self.base)], capture_output=True, text=True)
        self.assertEqual(good.returncode, 0, good.stderr)
        self.assertEqual(json.loads(good.stdout)["piCents"], 143892)
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)


if __name__ == "__main__":
    unittest.main()
