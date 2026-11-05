import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "monthly-budget", "tests", "golden.json")
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

    def test_budgets_match_the_javascript_answers(self):
        for c in GOLDEN["budgets"]:
            r = calc.plan_budget(c["input"])
            self.assertTrue(r["ok"], c["id"])
            r = {k: v for k, v in r.items() if k != "ok"}
            self.assertEqual(r, c["expect"], c["id"])

    def test_shares_add_to_100(self):
        for c in GOLDEN["budgets"]:
            r = calc.plan_budget(c["input"])
            if r["spendingCents"] > 0:
                self.assertEqual(sum(x["shareOfSpending"] for x in r["expenseRows"]), 100, c["id"])

    def test_bad_entries_name_the_line(self):
        for e in GOLDEN["errors"]:
            r = calc.plan_budget(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    def base(self):
        return {"income": [{"name": "Pay", "amount": "3000"}],
                "expenses": [{"name": "Rent", "amount": "1200"}, {"name": "Food", "amount": "400"}]}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), float("inf"), True, [], {}]
        for key in ("income", "expenses"):
            for j in junk:
                inp = self.base()
                inp[key][0]["amount"] = j
                r = calc.plan_budget(inp)
                self.assertIn("ok", r)
                blob = json.dumps(r)
                self.assertNotIn("NaN", blob)
                self.assertNotIn("Infinity", blob)

    def test_non_dict_input(self):
        for x in (None, [], "text", 5, {"income": "x", "expenses": 4}):
            self.assertFalse(calc.plan_budget(x)["ok"])

    def test_odd_lines_are_empty_lines(self):
        r = calc.plan_budget({"income": [None, 5, {"name": "Pay", "amount": "10"}], "expenses": [[]]})
        self.assertTrue(r["ok"])
        self.assertEqual(r["incomeCents"], 1000)
        self.assertEqual(r["incomeRows"][0]["name"], "Income line 1")

    def test_limits(self):
        many = [{"name": f"L{i}", "amount": "1"} for i in range(calc.MAX_ROWS)]
        self.assertTrue(calc.plan_budget({"income": many, "expenses": many})["ok"])
        self.assertFalse(calc.plan_budget({"income": many + [{"name": "x", "amount": "1"}], "expenses": []})["ok"])
        long = calc.plan_budget({"income": [{"name": "A" * 500, "amount": "1"}], "expenses": []})
        self.assertEqual(len(long["incomeRows"][0]["name"]), 60)

    def test_format_money(self):
        self.assertEqual(calc.format_money(-24975), "-$249.75")
        self.assertEqual(calc.format_money(123456), "$1,234.56")

    def test_cli(self):
        import subprocess
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        out = subprocess.run([sys.executable, script, json.dumps(self.base())], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["leftCents"], 140000)
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)


if __name__ == "__main__":
    unittest.main()
