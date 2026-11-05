# How it works

Each photo file is read and given a short fingerprint called SHA-256. Two files with the same fingerprint have the same bytes, so they are the same file, whatever their names are. That is what "exact copy" means here.

- The first file listed in a group is the biggest one. When sizes tie, the name that sorts first is listed first. Listing a file first does not mean the person should keep it.
- Groups are listed in the order the first file of each group appears in the folder (plain name order).
- A file with no bytes is left out. It is never part of a group.
- Up to 300 photos are read in one run. A file over 25 MB (25,000,000 bytes) is skipped with a note.
- Sizes use plain units: 1 KB is 1,000 bytes. They are rounded to one decimal.

What this does not do: it does not find photos that only look alike. The website draws each picture as a tiny grid of light and dark spots and compares them. That needs picture tools this skill does not have. Say so when asked.

The numbers match `tools/photo-duplicate-finder/calc.mjs`. Both read the same `golden.json`.
