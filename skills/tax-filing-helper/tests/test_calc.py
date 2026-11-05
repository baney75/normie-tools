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
    repo = os.path.join(HERE, "..", "..", "..", "tools", "tax-filing-helper", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()


def run(args):
    return subprocess.run([sys.executable, SCRIPT] + args, capture_output=True, text=True)


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_money_text(self):
        for c in GOLDEN["money"]:
            self.assertEqual(calc.parse_money(c["text"]), c["cents"], c["text"])

    def test_cases_match_the_javascript_answers(self):
        for c in GOLDEN["cases"]:
            r = calc.check_answers(calc.PRACTICE_SHEET, c["typed"])
            self.assertTrue(r["ok"], c["id"])
            e = c["expect"]
            self.assertEqual({x["id"]: x["status"] for x in r["rows"]}, e["statuses"], c["id"])
            for k in ("total", "matched", "different", "missing", "allMatch", "summary"):
                self.assertEqual(r[k], e[k], f"{c['id']} {k}")
            for rid, msg in e.get("messages", {}).items():
                self.assertEqual(next(x for x in r["rows"] if x["id"] == rid)["message"], msg, c["id"])

    def test_bad_sheets_name_the_problem(self):
        for e in GOLDEN["errors"]:
            r = calc.check_answers(e["sheet"], e["typed"])
            self.assertFalse(r["ok"], e["id"])
            self.assertEqual([[p["field"], p["kind"]] for p in r["problems"]], e["errors"], e["id"])
            for p in r["problems"]:
                self.assertGreater(len(p["message"]), 10)


class Messy(unittest.TestCase):
    def test_messy_text_never_raises(self):
        junk = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "lots", "\U0001F600", "NaN", "Infinity",
                None, 5, 1.5, float("nan"), float("inf"), True, [], {}, "x" * 500]
        for item in calc.PRACTICE_SHEET:
            for j in junk:
                r = calc.check_answers(calc.PRACTICE_SHEET, {item["id"]: j})
                self.assertTrue(r["ok"])
                self.assertEqual(r["matched"] + r["different"] + r["missing"], r["total"])
                self.assertNotIn("Infinity", json.dumps(r["summary"]))

    def test_typed_wrong_type_is_nothing_typed(self):
        for t in (None, [], "text", 5, True):
            self.assertEqual(calc.check_answers(calc.PRACTICE_SHEET, t)["missing"], len(calc.PRACTICE_SHEET))

    def test_bad_sheet_types(self):
        for s in (None, {}, [], "x", 5, [None], [5], [{}], [{"id": "a"}]):
            self.assertFalse(calc.check_answers(s, {})["ok"])

    def test_limits(self):
        many = [{"id": f"a{i}", "screen": "S", "label": f"L{i}", "kind": "text", "value": "x"} for i in range(calc.MAX_ITEMS + 1)]
        self.assertFalse(calc.check_answers(many, {})["ok"])
        self.assertTrue(calc.check_answers(many[:-1], {})["ok"])

    def test_practice_sheet_is_made_up(self):
        blob = json.dumps(calc.PRACTICE_SHEET)
        self.assertNotRegex(blob, r"\b\d{3}-\d{2}-\d{4}\b")
        for m in __import__("re").findall(r"[\w.+-]+@[\w.-]+", blob):
            self.assertTrue(m.endswith("@example.com"), m)


class CommandLine(unittest.TestCase):
    typed = {"typed": {"first-name": "Sample", "wages": "$32,450"}}

    def test_json_output(self):
        out = run([json.dumps(self.typed)])
        self.assertEqual(out.returncode, 0, out.stderr)
        r = json.loads(out.stdout)
        self.assertEqual(r["matched"], 2)
        self.assertEqual(r["missing"], 6)

    def test_text_output_is_plain_words(self):
        out = run(["--text", json.dumps(self.typed)])
        self.assertEqual(out.returncode, 0, out.stderr)
        lines = out.stdout.strip().split("\n")
        self.assertEqual(lines[0], "Last name: nothing typed yet. The sheet says Person.")
        self.assertIn("2 of 8 answers match. 6 need a look.", lines)
        self.assertLess(lines.index("Last name: nothing typed yet. The sheet says Person."), lines.index("2 of 8 answers match. 6 need a look."))
        self.assertFalse([l for l in lines if l.startswith("These match")])
        self.assertNotIn("First name: matches.", lines)
        self.assertLessEqual(len(lines), 10)
        self.assertIn("Last name: nothing typed yet. The sheet says Person.", lines)
        self.assertTrue(lines[-1].startswith("Note: "))
        self.assertNotIn("{", out.stdout)

    def test_text_output_all_match(self):
        data = {"typed": {k: v for k, v in [(i["id"], i["value"]) for i in calc.PRACTICE_SHEET]}}
        out = run(["--text", json.dumps(data)])
        self.assertTrue(out.stdout.startswith("All 8 answers match.\nThey are: First name, Last name, "))

    def test_text_output_for_problems(self):
        bad = {"sheet": [{"id": "a", "screen": "S", "label": "Pay", "kind": "money", "value": "lots"}], "typed": {}}
        out = run(["--text", json.dumps(bad)])
        self.assertEqual(out.returncode, 1)
        lines = out.stdout.strip().split("\n")
        self.assertEqual(lines[0], "Fix this first: Pay: the sheet needs a dollar amount like 1,200.50.")
        self.assertTrue(lines[-1].startswith("Note: "))

    def test_unreadable_input(self):
        for flags in ([], ["--text"]):
            out = run(flags + ["not json"])
            self.assertEqual(out.returncode, 1)
        self.assertIn("Fix this first:", run(["--text", "not json"]).stdout)
        self.assertEqual(run(["--text", "--file", "/no/such/file.json"]).returncode, 1)

    def test_examples_run(self):
        ex = os.path.join(HERE, "..", "examples")
        for name in sorted(os.listdir(ex)):
            out = run(["--text", "--file", os.path.join(ex, name)])
            self.assertEqual(out.returncode, 0, name)


if __name__ == "__main__":
    unittest.main()
