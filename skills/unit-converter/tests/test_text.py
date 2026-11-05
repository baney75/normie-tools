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
    def check(self, data, first, answer_line):
        code, lines = run_text(data)
        self.assertEqual(code, 0)
        self.assertEqual(lines[0], first)
        self.assertEqual(lines[1], answer_line)
        self.assertEqual(lines[2:], ["Shown to 6 digits.", "Conversions use exact standard factors."])

    def test_inches_to_millimeters(self):
        self.check({"category": "length", "from": "inch", "to": "millimeter", "value": "12"},
                   "12 inches is 304.8 millimeters.", "Your answer: 304.8 millimeters")

    def test_body_temperature(self):
        self.check({"category": "temperature", "from": "fahrenheit", "to": "celsius", "value": "98.6"},
                   "98.6 degrees Fahrenheit is 37 degrees Celsius.", "Your answer: 37 degrees Celsius")

    def test_cups_to_milliliters(self):
        self.check({"category": "volume", "from": "cup", "to": "milliliter", "value": "1.5"},
                   "1.5 US cups is 354.882 milliliters.", "Your answer: 354.882 milliliters")

    def test_typed_commas_and_spaces_are_kept(self):
        self.check({"category": "weight", "from": "pound", "to": "kilogram", "value": " 1,250.5 "},
                   "1,250.5 pounds is 567.217 kilograms.", "Your answer: 567.217 kilograms")

    def test_one_is_singular(self):
        self.check({"category": "length", "from": "mile", "to": "meter", "value": "1"},
                   "1 mile is 1,609.34 meters.", "Your answer: 1,609.34 meters")

    def test_negative_temperature(self):
        self.check({"category": "temperature", "from": "celsius", "to": "fahrenheit", "value": "-40"},
                   "-40 degrees Celsius is -40 degrees Fahrenheit.", "Your answer: -40 degrees Fahrenheit")

    def test_every_golden_answer_is_in_the_text(self):
        for c in GOLDEN["conversions"]:
            _code, lines = run_text(c["input"])
            self.assertIn("Your answer: %s " % c["expect"]["answer"], lines[1], c["id"])

    def test_problem_text(self):
        code, lines = run_text({"category": "length", "from": "pound", "to": "meter", "value": "5"})
        self.assertEqual(code, 1)
        self.assertEqual(lines, ["Fix this first: Change from: pick a unit from the list."])

    def test_json_without_flag_is_unchanged(self):
        for data in [c["input"] for c in GOLDEN["conversions"]]:
            _code, raw = run_json(data)
            self.assertEqual(raw, json.dumps(calc.convert_unit(data), indent=1, ensure_ascii=False) + "\n")

    def test_every_error_case_starts_with_fix_this_first(self):
        for e in GOLDEN["errors"]:
            code, lines = run_text(e["input"])
            self.assertEqual(code, 1, e["id"])
            self.assertEqual(len(lines), len(calc.convert_unit(e["input"])["problems"]), e["id"])
            for line in lines:
                self.assertTrue(line.startswith("Fix this first: "), (e["id"], line))

    def test_unreadable_json_is_plain_words(self):
        out = subprocess.run([sys.executable, SCRIPT, "not json", "--text"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 1)
        self.assertTrue(out.stdout.startswith("Fix this first: "))

    def test_no_dashes_or_cent_fields_in_text(self):
        for data in [c["input"] for c in GOLDEN["conversions"]]:
            _code, lines = run_text(data)
            blob = "\n".join(lines)
            self.assertNotIn("\u2014", blob)
            self.assertNotIn("\u2013", blob)
            self.assertNotIn("Cents", blob)
            self.assertNotIn("{", blob)


if __name__ == "__main__":
    unittest.main()
