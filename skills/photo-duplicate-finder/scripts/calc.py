#!/usr/bin/env python3
"""Photo Duplicate Finder, exact copies only. Standard library only. No network use.

Usage:
  python3 calc.py --folder PHOTO_FOLDER
  python3 calc.py --folder PHOTO_FOLDER --text
  python3 calc.py --file items.json --text

--folder reads photo files (.jpg .jpeg .png .webp .heic) in the folder and the folders inside it.
--file reads a list of {"id","name","size","sha256"} (the same shape the website uses).
Without --text it prints one JSON object. With --text it prints plain words, one fact per line,
a final note line, and "Fix this first:" lines for problems.

This groups files with the same SHA-256 only. A "look alike" check needs the pictures drawn
as a tiny grid, which the standard library cannot do, so it is on the website only.
It is a Python copy of the exact-copy part of tools/photo-duplicate-finder/calc.mjs.
Both must give the same answers (tests/golden.json). It only reads. It never deletes or moves a file.
"""
import hashlib
import json
import os
import re
import sys

MAX_PHOTOS = 300
MAX_BYTES = 25_000_000
EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".heic")
HEX64 = re.compile(r"^[0-9a-fA-F]{64}$")
HEX16 = re.compile(r"^[0-9a-fA-F]{16}$")
NOTE = (
    "Note: this finds exact copies only. Photos that only look alike need the Photo Duplicate Finder website. "
    "Nothing was deleted or moved."
)


def format_bytes(n):
    """Plain size text, decimal units, one decimal, rounded half up."""
    if not isinstance(n, (int, float)) or isinstance(n, bool) or n != n or n in (float("inf"), float("-inf")) or n < 0:
        return "0 bytes"
    if n < 1000:
        n = int(n)
        return "%d %s" % (n, "byte" if n == 1 else "bytes")
    units = [(1000, "KB"), (1_000_000, "MB"), (1_000_000_000, "GB")]
    for i, (size, label) in enumerate(units):
        tenths = int((n * 10 * 2 + size) // (2 * size))
        if tenths < 10000 or i == len(units) - 1:
            return "%d.%d %s" % (tenths // 10, tenths % 10, label)
    return "0 bytes"


def _problem(field, message, kind="bad"):
    return {"field": field, "kind": kind, "message": message}


def find_duplicates(items):
    """Exact-copy groups. Same answer as findDuplicates in calc.mjs for items with no look-alike code."""
    if not isinstance(items, list):
        return {"ok": False, "problems": [_problem("items", "Pick some photos first.")]}
    if len(items) > MAX_PHOTOS:
        return {
            "ok": False,
            "problems": [_problem("items", "That is more than %d photos. Use fewer photos in one run." % MAX_PHOTOS, "too-many")],
        }
    problems = []
    seen = set()
    good = []
    ignored = []
    for i, it in enumerate(items):
        field = "items.%d" % i
        n = i + 1
        if not isinstance(it, dict):
            problems.append(_problem(field, "Photo %d could not be read." % n))
            continue
        pid, name, size, sha = it.get("id"), it.get("name"), it.get("size"), it.get("sha256")
        if not isinstance(pid, str) or not pid:
            problems.append(_problem(field, "Photo %d has no id." % n))
            continue
        if pid in seen:
            problems.append(_problem(field, "Photo %d is listed twice." % n))
            continue
        seen.add(pid)
        if not isinstance(name, str) or not name.strip():
            problems.append(_problem(field, "Photo %d has no name." % n))
            continue
        if isinstance(size, bool) or not isinstance(size, int) or size < 0:
            problems.append(_problem(field, "%s has a size that does not make sense." % name))
            continue
        if not isinstance(sha, str) or not HEX64.match(sha):
            problems.append(_problem(field, "%s could not be checked." % name))
            continue
        if size == 0:
            ignored.append({"id": pid, "reason": "empty"})
            continue
        good.append({"id": pid, "name": name, "size": size, "sha256": sha.lower()})
    if problems:
        return {"ok": False, "problems": problems}
    by_sha = {}
    for p in good:
        by_sha.setdefault(p["sha256"], []).append(p)
    groups = []
    for p in good:  # in order of first appearance
        members = by_sha[p["sha256"]]
        if len(members) < 2 or members[0] is not p:
            continue
        ordered = sorted(members, key=lambda m: (-m["size"], m["name"], m["id"]))
        groups.append({"id": "g-" + p["id"], "kind": "exact", "members": [m["id"] for m in ordered], "keepId": ordered[0]["id"]})
    extras = sum(len(g["members"]) - 1 for g in groups)
    return {
        "ok": True,
        "groups": groups,
        "ignored": ignored,
        "counts": {"photos": len(good), "exactGroups": len(groups), "lookAlikeGroups": 0, "extras": extras},
    }


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def scan_folder(folder):
    """Returns (items, skipped). Files are read in plain name order. Nothing is changed."""
    found = []
    for root, dirs, files in os.walk(folder):
        dirs.sort()
        for fname in sorted(files):
            if fname.lower().endswith(EXTENSIONS):
                full = os.path.join(root, fname)
                found.append((os.path.relpath(full, folder).replace(os.sep, "/"), full))
    found.sort(key=lambda t: t[0])
    items, skipped = [], []
    for rel, full in found:
        try:
            size = os.path.getsize(full)
        except OSError:
            skipped.append({"name": rel, "reason": "unreadable", "message": "%s could not be read, so it was skipped." % rel})
            continue
        if size == 0:
            skipped.append({"name": rel, "reason": "empty", "message": "%s is empty, so it was skipped." % rel})
        elif size > MAX_BYTES:
            skipped.append({
                "name": rel, "reason": "too-big",
                "message": "%s is %s. That is over %s, so it was skipped." % (rel, format_bytes(size), format_bytes(MAX_BYTES)),
            })
        elif len(items) >= MAX_PHOTOS:
            skipped.append({
                "name": rel, "reason": "over-cap",
                "message": "%s was left out. Up to %d photos are checked at a time." % (rel, MAX_PHOTOS),
            })
        else:
            try:
                sha = sha256_file(full)
            except OSError:
                skipped.append({"name": rel, "reason": "unreadable", "message": "%s could not be read, so it was skipped." % rel})
                continue
            items.append({"id": "p%d" % (len(items) + 1), "name": rel, "size": size, "sha256": sha})
    return items, skipped


def run_items(items, skipped=None):
    result = find_duplicates(items)
    if result["ok"]:
        result["photos"] = [{"id": p["id"], "name": p["name"], "size": p["size"]} for p in items]
        result["skipped"] = skipped or []
        result["note"] = NOTE
    return result


def to_text(result):
    """Plain words, one fact per line, then the note line."""
    if not result.get("ok"):
        lines = ["Fix this first: " + p["message"] for p in result.get("problems", [])]
        lines.append(NOTE)
        return "\n".join(lines)
    by_id = {p["id"]: p for p in result.get("photos", [])}
    c = result["counts"]
    lines = ["Photos checked: %d" % c["photos"], "Exact copy groups: %d" % c["exactGroups"]]
    total = 0
    for i, g in enumerate(result["groups"], 1):
        keep = by_id.get(g["keepId"], {"name": g["keepId"], "size": 0})
        extras = [by_id.get(m, {"name": m, "size": 0}) for m in g["members"] if m != g["keepId"]]
        total += sum(e["size"] for e in extras)
        lines.append(
            "Group %d of %d: %s (%s) is listed first. Same file: %s." % (i, len(result["groups"]), keep["name"], format_bytes(keep["size"]),
                                                       ", ".join("%s (%s)" % (e["name"], format_bytes(e["size"])) for e in extras))
        )
    lines.append("Extra copies: %d" % c["extras"])
    lines.append("Room the extra copies take: %s" % format_bytes(total))
    for s in result.get("skipped", []):
        lines.append("Skipped: " + s["message"])
    if result.get("ignored"):
        lines.append("Empty files left out: %d" % len(result["ignored"]))
    lines.append(NOTE)
    return "\n".join(lines)


def _fail(message, as_text):
    out = {"ok": False, "problems": [_problem("input", message)]}
    print(to_text(out) if as_text else json.dumps(out, separators=(",", ":")))
    return 2


def main(argv):
    as_text = "--text" in argv
    args = [a for a in argv if a != "--text"]
    if len(args) == 2 and args[0] == "--folder":
        if not os.path.isdir(args[1]):
            return _fail("I could not find that folder. Check the folder name.", as_text)
        items, skipped = scan_folder(args[1])
        result = run_items(items, skipped)
    elif len(args) == 2 and args[0] == "--file":
        try:
            with open(args[1], encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            return _fail("I could not read that file. It should be a list of photos in JSON.", as_text)
        items = data.get("items") if isinstance(data, dict) else data
        result = run_items(items)
    else:
        print(__doc__)
        return 2
    print(to_text(result) if as_text else json.dumps(result, separators=(",", ":"), ensure_ascii=False))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
