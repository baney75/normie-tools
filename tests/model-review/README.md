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
