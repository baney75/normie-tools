# Skill evals

Status: stub. `run.mjs` loads each `cases/*.json` file, checks its shape, and lists the cases. It does not call a model yet.

## Case format

```json
{
  "skill": "receipt-to-spreadsheet",
  "task": "What the person asks, in their words.",
  "files": ["examples/sample-receipts.csv"],
  "expect": ["total is 15.83", "asks before saving"]
}
```

## Plan

1. Run each task with the skill installed and with it removed, using the same model.
2. Check each `expect` line against the answer.
3. Compare the two scores. A skill must beat no skill to ship.

Model runs happen only when you start them on purpose, as in `tests/model-review/`. The shape check is part of `npm test`.

Run the stub: `node tests/skill-evals/run.mjs`.
