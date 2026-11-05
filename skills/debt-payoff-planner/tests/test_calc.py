import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402

SCRIPT = os.path.join(HERE, "..", "scripts", "calc.py")


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "debt-payoff-planner", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_plans_match_the_javascript_answers(self):
        for c in GOLDEN["plans"]:
            r = calc.plan_debt_payoff(c["input"])
            self.assertTrue(r["ok"], c["id"])
            self.assertEqual({k: v for k, v in r.items() if k != "ok"}, c["expect"], c["id"])

    def test_bad_entries_name_the_debt_and_field(self):
        for e in GOLDEN["errors"]:
            r = calc.plan_debt_payoff(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)
                for bad in ("NaN", "None", "Infinity", "undefined"):
                    self.assertNotIn(bad, p["message"])

    def test_plan_totals_add_up(self):
        for c in GOLDEN["plans"]:
            r = calc.plan_debt_payoff(c["input"])
            for plan in ("snowball", "avalanche"):
                self.assertEqual(r[plan]["totalPaidCents"] - r["totalBalanceCents"], r[plan]["totalInterestCents"], c["id"])
                self.assertEqual(r[plan]["order"][-1]["month"], r[plan]["months"], c["id"])


class Messy(unittest.TestCase):
    row = {"name": "Card", "balance": "1000", "rate": "18", "minimum": "50"}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), True, [], {}]
        for field in ("name", "balance", "rate", "minimum"):
            for j in junk:
                r = calc.plan_debt_payoff({"debts": [dict(self.row, **{field: j})], "extra": ""})
                self.assertIn("ok", r)
                blob = json.dumps(r)
                if field == "name":
                    continue  # a name is only a label, so "NaN" as a name is allowed
                self.assertNotIn("NaN", blob)
                self.assertNotIn("Infinity", blob)
        for j in junk:
            self.assertIn("ok", calc.plan_debt_payoff({"debts": [self.row], "extra": j}))

    def test_non_dict_input(self):
        for x in (None, [], "text", 5, {"debts": "x"}, {"debts": [None, 5, []]}):
            self.assertFalse(calc.plan_debt_payoff(x)["ok"])

    def test_edges(self):
        self.assertTrue(calc.plan_debt_payoff({"debts": [dict(self.row, rate="0")]})["ok"])
        r = calc.plan_debt_payoff({"debts": [{"name": "", "balance": "0.01", "rate": "0", "minimum": "0.01"}]})
        self.assertEqual(r["snowball"]["months"], 1)
        self.assertEqual(calc.plan_debt_payoff({"debts": [dict(self.row, name="x" * 500)]})["debts"][0]["name"], "x" * 40)
        self.assertEqual(calc.plan_debt_payoff({"debts": [dict(self.row, name="\x00\n")]})["debts"][0]["name"], "Debt 1")

    def test_rounding_half_up(self):
        self.assertEqual(calc.div_round_half_up(1, 2), 1)
        self.assertEqual(calc.div_round_half_up(49, 100), 0)
        self.assertEqual(calc.month_interest(1200, 50), 1)
        self.assertEqual(calc.month_interest(1199, 50), 0)
        self.assertEqual(calc.month_interest(50000, 1800), 750)

    def test_cli(self):
        good = {"debts": [{"name": "Tiny", "balance": "12", "rate": "0.5", "minimum": "5"}], "extra": ""}
        out = subprocess.run([sys.executable, SCRIPT, json.dumps(good)], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["snowball"]["months"], 3)
        bad = subprocess.run([sys.executable, SCRIPT, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)
        low = subprocess.run([sys.executable, SCRIPT, json.dumps({"debts": [{"balance": "10000", "rate": "24", "minimum": "200"}]})],
                             capture_output=True, text=True)
        self.assertEqual(low.returncode, 1)
        self.assertIn("does not cover", json.loads(low.stdout)["problems"][0]["message"])


if __name__ == "__main__":
    unittest.main()
