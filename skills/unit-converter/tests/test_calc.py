import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import calc  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "unit-converter", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_conversions_match_the_javascript_answers(self):
        for c in GOLDEN["conversions"]:
            r = calc.convert_unit(c["input"])
            self.assertTrue(r["ok"], c["id"])
            self.assertEqual(r["answer"], c["expect"]["answer"], c["id"])

    def test_bad_entries_name_the_field(self):
        for e in GOLDEN["errors"]:
            r = calc.convert_unit(e["input"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    base = {"category": "length", "from": "inch", "to": "millimeter", "value": "12"}

    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), float("inf"), True, [], {}]
        for category, units in calc.CATEGORIES.items():
            for j in junk:
                inp = {"category": category, "from": units[0]["id"], "to": units[1]["id"], "value": j}
                r = calc.convert_unit(inp)
                self.assertIn("ok", r)
                blob = json.dumps(r)
                self.assertNotIn("NaN", blob)
                self.assertNotIn("Infinity", blob)

    def test_non_dict_input(self):
        for x in (None, [], "text", 5):
            self.assertFalse(calc.convert_unit(x)["ok"])

    def test_odd_names_are_rejected(self):
        for bad in ("", "__proto__", "constructor", "INCH", None, 5):
            self.assertFalse(calc.convert_unit(dict(self.base, **{"from": bad}))["ok"])
            self.assertFalse(calc.convert_unit(dict(self.base, category=bad))["ok"])

    def test_every_pair_works(self):
        for category, units in calc.CATEGORIES.items():
            for a in units:
                for b in units:
                    r = calc.convert_unit({"category": category, "from": a["id"], "to": b["id"], "value": "37.5"})
                    self.assertTrue(r["ok"], (a["id"], b["id"]))

    def test_rounding_half_up(self):
        self.assertEqual(calc.div_round_half_up(1, 2), 1)
        self.assertEqual(calc.div_round_half_up(49, 100), 0)
        self.assertEqual(calc.format_significant(1234565, 1), "1,234,570")
        self.assertEqual(calc.format_significant(1234564, 1), "1,234,560")
        self.assertEqual(calc.format_significant(9999995, 10), "1,000,000")

    def test_absolute_zero(self):
        ok = calc.convert_unit({"category": "temperature", "from": "kelvin", "to": "celsius", "value": "0"})
        self.assertEqual(ok["answer"], "-273.15")
        cold = calc.convert_unit({"category": "temperature", "from": "celsius", "to": "kelvin", "value": "-273.16"})
        self.assertFalse(cold["ok"])

    def test_cli(self):
        import subprocess
        script = os.path.join(HERE, "..", "scripts", "calc.py")
        out = subprocess.run([sys.executable, script, json.dumps(self.base)], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout)["answer"], "304.8")
        bad = subprocess.run([sys.executable, script, "not json"], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)

    def test_examples_run(self):
        folder = os.path.join(HERE, "..", "examples")
        for name in sorted(os.listdir(folder)):
            with open(os.path.join(folder, name), encoding="utf-8") as f:
                self.assertTrue(calc.convert_unit(json.load(f))["ok"], name)


if __name__ == "__main__":
    unittest.main()
