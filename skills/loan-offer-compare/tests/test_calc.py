import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "loan-offer-compare", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_offers_match_the_javascript_answers(self):
        for c in GOLDEN["cases"]:
            r = calc.compare_offers(c["input"])
            self.assertTrue(r["ok"], c["id"])
            r = {k: v for k, v in r.items() if k != "ok"}
            self.assertEqual(r, c["expect"], c["id"])

    def test_ties_are_all_named(self):
        r = calc.compare_offers(next(c for c in GOLDEN["cases"] if c["id"] == "tie-identical")["input"])
        self.assertEqual(r["lowestCost"], {"offers": [0, 1], "tie": True})
        self.assertEqual(r["lowestPayment"], {"offers": [0, 1], "tie": True})

    def test_bad_entries_name_the_offer_and_field(self):
        for e in GOLDEN["errors"]:
            r = calc.compare_offers(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["offer"], p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    offer = {"amount": "10000", "rate": "6", "term": "36", "termUnit": "months", "fees": ""}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), True, [], {}]
        for index in (0, 1):
            for field in ("amount", "rate", "term", "fees"):
                for j in junk:
                    offers = [dict(self.offer), dict(self.offer, rate="5")]
                    offers[index][field] = j
                    r = calc.compare_offers({"offers": offers})
                    self.assertIn("ok", r)
                    blob = json.dumps(r)
                    self.assertNotIn("NaN", blob)
                    self.assertNotIn("Infinity", blob)

    def test_wrong_shapes(self):
        for x in (None, [], "text", 5, {}, {"offers": "x"}, {"offers": [None, 5]}, {"offers": [[], []]}):
            self.assertFalse(calc.compare_offers(x)["ok"])

    def test_edges(self):
        def two(**kw):
            return {"offers": [dict(self.offer, **kw), dict(self.offer)]}
        self.assertTrue(calc.compare_offers(two(rate="0"))["ok"])
        self.assertTrue(calc.compare_offers(two(term="1"))["ok"])
        self.assertTrue(calc.compare_offers(two(term="1200"))["ok"])
        self.assertFalse(calc.compare_offers(two(term="1201"))["ok"])
        self.assertFalse(calc.compare_offers({"offers": [self.offer] * 4})["ok"])
        self.assertTrue(calc.compare_offers({"offers": [self.offer] * 3})["ok"])

    def test_rounding_half_up(self):
        self.assertEqual(calc.div_round_half_up(1, 2), 1)
        self.assertEqual(calc.div_round_half_up(49, 100), 0)
        self.assertEqual(calc.monthly_payment(100, 0, 8), 13)

    def test_cli(self):
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        out = subprocess.run([sys.executable, script, json.dumps({"offers": [self.offer, dict(self.offer, rate="5")]})],
                             capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["offers"][0]["monthlyPaymentCents"], 30422)
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)


if __name__ == "__main__":
    unittest.main()
