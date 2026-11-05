import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
import fill  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "form-filler", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()
EXAMPLES = os.path.join(HERE, "..", "examples")


def run_cli(*args):
    p = subprocess.run([sys.executable, "-I", os.path.join(SCRIPTS, "fill.py"), *args], capture_output=True, text=True)
    return p.returncode, p.stdout


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_info_boxes(self):
        for c in GOLDEN["info"]:
            ok, out = fill.check_info(c["field"], c["input"])
            if c["expect"] is None:
                self.assertFalse(ok, c)
                self.assertGreater(len(out), 5)
            else:
                self.assertTrue(ok, c)
                self.assertEqual(out, c["expect"], c)

    def test_ways(self):
        for c in GOLDEN["ways"]:
            r = fill.pick_way(c["answers"])
            self.assertEqual(r["way"], c["way"])
            self.assertEqual(r["name"], c["name"])
            joined = "\n".join(r["lines"])
            for s in c.get("has", []):
                self.assertIn(s, joined)
            for s in c.get("hasNot", []):
                self.assertNotIn(s, joined)

    def test_sheets_match_the_javascript_sheets(self):
        for c in GOLDEN["sheets"]:
            r = fill.build_sheet(c["input"])
            self.assertTrue(r["ok"], c["id"])
            self.assertEqual(r["way"], c["way"], c["id"])
            self.assertEqual(r["text"], c["expect"], c["id"])

    def test_saved_files_are_refused_with_the_same_words(self):
        for c in GOLDEN["saved"]:
            data, problems = fill.parse_saved(c["text"])
            self.assertIsNone(data, c["id"])
            self.assertEqual(problems[0]["message"], c["message"], c["id"])

    def test_no_social_security_box(self):
        self.assertFalse(any("social" in f.lower() or "ssn" in f.lower() for f, _ in fill.INFO_FIELDS))
        r = fill.build_sheet({"info": {"ssn": "123-45-6789"}})
        self.assertTrue(r["ok"])
        self.assertNotIn("123-45-6789", r["text"])
        self.assertIn("You type your Social Security number yourself on the IRS partner site.", r["text"])


class Messy(unittest.TestCase):
    def test_messy_values_never_raise(self):
        values = [None, 0, 1e15, True, [], {}, "", " ", "1,000", "$1,000.50", "1e3", "-5", "text", "\U0001F600", "x" * 5000, "\x00", "<script>"]
        for f, _ in fill.INFO_FIELDS:
            for v in values:
                ok, out = fill.check_info(f, v)
                self.assertIsInstance(out, str)
                self.assertNotIn("None", out)
        for v in values + [[1], {"info": 5}]:
            r = fill.build_sheet(v)
            self.assertIn("ok", r)

    def test_messy_files(self):
        for t in ["", "[", "null", "[]", "x" * 300000, '{"format":"nt-form-filler","version":1,"papers":[1,{}]}', "%PDF-1.4\n%%EOF"]:
            data, problems = fill.parse_saved(t)
            self.assertTrue(data is not None or problems)

    def test_code_like_text_stays_text(self):
        data, problems = fill.parse_saved('{"format":"nt-form-filler","version":1,"info":{"firstName":"alert()"}}')
        self.assertEqual(problems, [])
        self.assertEqual(data["info"]["firstName"], "alert()")


class Text(unittest.TestCase):
    def test_text_flag_gives_plain_words(self):
        code, out = run_cli("--file", os.path.join(EXAMPLES, "guided.json"), "--text")
        self.assertEqual(code, 0)
        lines = out.strip().split("\n")
        self.assertEqual(lines[0], "Free way that may fit: Guided Free File.")
        self.assertIn("First name: Ana.", lines)
        self.assertIn("Birth date: 02/29/1960.", lines)
        self.assertIn("Papers ticked: 3 of 9.", lines)
        self.assertTrue(lines[-1].startswith("Note:"))
        self.assertFalse(any(l.startswith("{") or l.startswith('"') for l in lines))
        self.assertNotIn("Fix this first:", out)

    def test_text_flag_names_each_problem(self):
        code, out = run_cli("--file", os.path.join(EXAMPLES, "messy.json"), "--text")
        self.assertEqual(code, 1)
        lines = out.strip().split("\n")
        fixes = [l for l in lines if l.startswith("Fix this first:")]
        self.assertEqual(len(fixes), 7)
        self.assertIn("Fix this first: ZIP code: type 5 numbers, like 12345.", lines)
        self.assertTrue(lines[-1].startswith("Note:"))

    def test_text_for_a_missing_file(self):
        code, out = run_cli("--file", os.path.join(tempfile.gettempdir(), "no-such-answer-file.json"), "--text")
        self.assertEqual(code, 1)
        self.assertIn("Fix this first: This file could not be opened.", out)

    def test_json_stays_json_without_the_flag(self):
        code, out = run_cli("--file", os.path.join(EXAMPLES, "guided.json"))
        self.assertEqual(code, 0)
        data = json.loads(out)
        self.assertTrue(data["ok"])
        self.assertEqual(data["way"], "guided")
        self.assertTrue(data["text"].startswith("Form Filler answer sheet"))
        code, out = run_cli("--file", os.path.join(EXAMPLES, "messy.json"))
        self.assertEqual(code, 1)
        self.assertFalse(json.loads(out)["ok"])

    def test_sheet_flag_prints_the_sheet(self):
        code, out = run_cli("--file", os.path.join(EXAMPLES, "guided.json"), "--sheet")
        self.assertEqual(code, 0)
        self.assertTrue(out.startswith("Form Filler answer sheet\n"))

    def test_fillable_example_text(self):
        code, out = run_cli("--file", os.path.join(EXAMPLES, "fillable.json"), "--text")
        self.assertEqual(code, 0)
        self.assertIn("Phone number: 555-010-9876.", out)
        self.assertIn("State: TX.", out)
        self.assertIn("Start at IRS.gov/freefile.", out)
        self.assertIn("a VITA volunteer can help for free", out)


if __name__ == "__main__":
    unittest.main()
