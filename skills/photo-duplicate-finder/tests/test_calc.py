import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
import calc  # noqa: E402


def load_golden():
    repo = os.path.join(HERE, "..", "..", "..", "tools", "photo-duplicate-finder", "tests", "golden.json")
    path = repo if os.path.isfile(repo) else os.path.join(HERE, "golden.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


GOLDEN = load_golden()
CALC = os.path.join(SCRIPTS, "calc.py")


def make_folder(root):
    """Made-up bytes. Not real photos."""
    files = {
        "holiday/beach.jpg": b"made-up beach bytes",
        "holiday/beach copy.jpg": b"made-up beach bytes",
        "dog.png": b"made-up dog bytes",
        "dog-again.PNG": b"made-up dog bytes",
        "dog-third.png": b"made-up dog bytes",
        "tree.webp": b"made-up tree bytes",
        "empty.jpg": b"",
        "notes.txt": b"made-up beach bytes",
    }
    for rel, data in files.items():
        full = os.path.join(root, *rel.split("/"))
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(data)


def run_cli(*args):
    p = subprocess.run([sys.executable, "-I", CALC, *args], capture_output=True, text=True)
    return p.returncode, p.stdout


class Golden(unittest.TestCase):
    def test_copy_matches_repo_golden(self):
        with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), GOLDEN)

    def test_sha256_of_made_up_bytes(self):
        import hashlib

        for c in GOLDEN["sha256"]:
            self.assertEqual(hashlib.sha256(c["text"].encode()).hexdigest(), c["hex"])

    def test_exact_groups_match_the_javascript_answers(self):
        for c in GOLDEN["exactCases"]:
            r = calc.find_duplicates(c["items"])
            self.assertTrue(r["ok"], c["id"])
            got = {"groups": r["groups"], "ignored": r["ignored"], "counts": r["counts"]}
            self.assertEqual(got, c["expect"], c["id"])

    def test_format_bytes_matches(self):
        for n, s in GOLDEN["formatBytes"]:
            self.assertEqual(calc.format_bytes(n), s, str(n))

    def test_caps_match(self):
        self.assertEqual(calc.MAX_PHOTOS, GOLDEN["caps"]["maxPhotos"])
        self.assertEqual(calc.MAX_BYTES, GOLDEN["caps"]["maxBytes"])


class Messy(unittest.TestCase):
    def test_bad_input_gives_plain_problems(self):
        sha = "ab" * 32
        good = {"id": "ok", "name": "ok.jpg", "size": 5, "sha256": sha}
        bad_items = [None, 3, "x", {}, dict(good, size=-1), dict(good, size=1.5), dict(good, sha256="short"),
                     dict(good, name=""), dict(good, id=""), dict(good, size=True)]
        for b in bad_items:
            r = calc.find_duplicates([good, b])
            self.assertFalse(r["ok"], repr(b))
            self.assertEqual(r["problems"][0]["field"], "items.1")
            self.assertGreater(len(r["problems"][0]["message"]), 5)
        for junk in (None, "photos", 5, {}):
            self.assertFalse(calc.find_duplicates(junk)["ok"])
        self.assertFalse(calc.find_duplicates([good, dict(good)])["ok"])

    def test_300_the_same_file_is_one_group_and_301_is_refused(self):
        items = [{"id": "p%d" % i, "name": "copy %d.jpg" % i, "size": 10, "sha256": "cd" * 32} for i in range(300)]
        r = calc.find_duplicates(items)
        self.assertEqual((len(r["groups"]), r["counts"]["extras"]), (1, 299))
        self.assertFalse(calc.find_duplicates(items + [dict(items[0], id="more")])["ok"])

    def test_empty_list_is_fine(self):
        r = calc.find_duplicates([])
        self.assertTrue(r["ok"])
        self.assertEqual(r["groups"], [])


class Folder(unittest.TestCase):
    def test_folder_groups_exact_copies_and_skips_empty(self):
        with tempfile.TemporaryDirectory() as d:
            make_folder(d)
            code, out = run_cli("--folder", d)
            self.assertEqual(code, 0)
            r = json.loads(out)
            self.assertTrue(r["ok"])
            names = {p["id"]: p["name"] for p in r["photos"]}
            groups = [[names[m] for m in g["members"]] for g in r["groups"]]
            self.assertIn(["dog-again.PNG", "dog-third.png", "dog.png"], groups)
            self.assertIn(["holiday/beach copy.jpg", "holiday/beach.jpg"], groups)
            self.assertEqual(len(groups), 2)
            self.assertEqual(r["counts"]["extras"], 3)
            self.assertEqual([s["reason"] for s in r["skipped"]], ["empty"])
            self.assertNotIn("notes.txt", names.values())

    def test_script_changes_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            make_folder(d)
            before = sorted(os.listdir(d))
            run_cli("--folder", d, "--text")
            self.assertEqual(sorted(os.listdir(d)), before)
            self.assertTrue(os.path.isfile(os.path.join(d, "dog.png")))

    def test_missing_folder_is_a_plain_problem(self):
        code, out = run_cli("--folder", os.path.join(tempfile.gettempdir(), "no-such-photo-folder-xyz"), "--text")
        self.assertEqual(code, 2)
        self.assertTrue(out.startswith("Fix this first: "))

    def test_example_items_file(self):
        code, out = run_cli("--file", os.path.join(HERE, "..", "examples", "sample-items.json"), "--text")
        self.assertEqual(code, 0)
        self.assertIn("Exact copy groups: 2", out)


class TextOutput(unittest.TestCase):
    def test_text_has_one_fact_per_line_and_a_final_note(self):
        with tempfile.TemporaryDirectory() as d:
            make_folder(d)
            code, out = run_cli("--folder", d, "--text")
            self.assertEqual(code, 0)
            lines = out.strip().split("\n")
            self.assertEqual(lines[0], "Photos checked: 6")
            self.assertEqual(lines[1], "Exact copy groups: 2")
            self.assertTrue(any(l.startswith("Group 1 of 2: ") for l in lines))
            self.assertTrue(any(l.startswith("Group 2 of 2: ") for l in lines))
            self.assertIn("Extra copies: 3", lines)
            self.assertTrue(any(l.startswith("Room the extra copies take: ") for l in lines))
            self.assertTrue(any(l.startswith("Skipped: empty.jpg is empty") for l in lines))
            self.assertEqual(lines[-1], calc.NOTE)
            self.assertIn("Nothing was deleted or moved.", lines[-1])
            self.assertNotIn("{", out)

    def test_text_for_problems_starts_with_fix_this_first(self):
        out = calc.to_text(calc.find_duplicates([{"id": "a", "name": "a.jpg", "size": -4, "sha256": "x"}]))
        lines = out.split("\n")
        self.assertTrue(lines[0].startswith("Fix this first: "))
        self.assertEqual(lines[-1], calc.NOTE)

    def test_text_without_flag_is_json(self):
        with tempfile.TemporaryDirectory() as d:
            make_folder(d)
            _, out = run_cli("--folder", d)
            self.assertTrue(json.loads(out)["ok"])

    def test_text_when_nothing_matches(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "a.jpg"), "wb") as f:
                f.write(b"one")
            with open(os.path.join(d, "b.jpg"), "wb") as f:
                f.write(b"two")
            _, out = run_cli("--folder", d, "--text")
            lines = out.strip().split("\n")
            self.assertEqual(lines[:2], ["Photos checked: 2", "Exact copy groups: 0"])
            self.assertIn("Extra copies: 0", lines)


if __name__ == "__main__":
    unittest.main()
