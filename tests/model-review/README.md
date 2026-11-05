# Model review

Two pinned prompts that ask a model to react to one screen.

- `prompts/first-time-user.md`: a first-time visitor (Sonnet). Finds confusing words and worries.
- `prompts/design-rubric.md`: a checklist grader (Haiku, or Sonnet for a second opinion). Scores eight NT design rules.

## Pins

`prompts.sha256.json` holds the SHA-256 of each prompt. A normal test run only checks that the files exist and match. It never calls a model. Change a prompt on purpose, review the change, then run `node tests/model-review/run.mjs --pin` and commit both files.

## Run a review by hand

1. Save the text of one screen to a file, for example `/tmp/home.txt`.
2. Run `node tests/model-review/run.mjs first-time-user /tmp/home.txt`.
3. Run `node tests/model-review/run.mjs design-rubric /tmp/home.txt`.
4. Add `--model <name>` to try another model.

The harness runs the `claude` command in print mode and needs you to be signed in. It is never run by `npm test`, or CI.

Model output varies. Treat a run as advice. The deterministic checks in `npm test` are the hard gate.

## Review a whole tool (the evidence gate)

`review.mjs` captures the page at 390px wide in a real browser, writes what a reader sees to `screens/`, runs the two pinned prompts, and writes `tests/model-review/<tool>.json`.

```bash
cd site && npx vite build --outDir /tmp/nt-dist && npx vite preview --outDir /tmp/nt-dist --port 4180 &
node tests/model-review/review.mjs monthly-budget --url http://127.0.0.1:4180
```

- Calculators are read twice: empty, and with the person's numbers typed. A tool with steps has a scene file in `scenes/<tool>.mjs` that walks the screens and captures each one.
- The screen text lists every visible heading, label, hint, box with its value, and button, and says whether a button is filled in the main-button colour. Hints in plain spans are included.
- The first-time-user prompt runs on each screen as many times as `--ftu-runs` says (3 by default). The evidence records use 9 (owner decision, 2026-11-05). The middle score is kept and every run is on record.
- The design rubric runs `--rubric-runs` times (3 by default; the evidence records use 5) for Haiku and for Sonnet. A rule passes when it passes in most runs.
- `node scripts/check-evidence.mjs` is the gate: every screen needs a reader score of 4 or more and every rule passing for both graders, and the skill-eval results must meet their bars. No record means the tool cannot stay shipped.

## Owner waivers

`waivers.json` lets the owner excuse a named check for a named tool, for example `first-time-user` or `rule8`. Each entry needs `tool`, `checks`, `by`, `date` and `said` (the owner's words). `check:evidence` prints every excused problem as `WAIVED` and still fails on anything not named. Remove an entry once the tool passes without it.
