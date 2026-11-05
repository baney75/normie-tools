# skills/

Add-ons that teach AI apps how to call NT tools in plain words.

Status: early. One scaffold, `receipt-to-spreadsheet/`, for a coming soon tool. It is not packaged for people. Layout, levels, and sandbox rules are in [../docs/skills-guide.md](../docs/skills-guide.md).

```bash
npm run build:skills                                    # shipped tools only
python3 scripts/build_skills.py --include-coming-soon   # also scaffolds, into dist/skills/
npm run test:skills                                     # unit tests for the example scripts
```
