# cli/

The nt command for AI helpers that run on a computer. Builders only until labeled otherwise.

Status: early. Python standard library only, no network.

```bash
python3 cli/nt.py refs search "autosave resume"
python3 cli/nt.py tools --status coming_soon
```

`npm run nt -- refs search "<words>"` does the same. `refs search` looks in `research/` through `scripts/refs.py`, which skills also carry so they can search their own `references/` folder.
