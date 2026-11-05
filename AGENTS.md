# AGENTS.md

Rules for agents working on this repo and the future NT site. Product name is NT. Repo name is `normie-tools`. Use "normie" respectfully: everyday people with no tech background.

## House rules

1. **Plain language.** Person-facing text targets about grade 6. No glossary terms from `docs/glossary.md` in person-facing copy.
2. **No-clutter rule.** Keep screens and copy short. Prefer one idea per sentence. Prefer short words. Drop decoration that does not help the task. (Full numeric limits land with the no-clutter note in `plan/v5-work/` when that file arrives.)
3. **Neurodivergent rule.** Support focus and memory: clear progress, autosave and resume, low distraction, predictable layout, reduced motion when requested. (Full rule file may still arrive in `plan/v5-work/`.)
4. **Upload errors.** When a file type is wrong, name the type given and the type needed, and explain how to get the needed type in plain words.
5. **Never invent facts.** If a number, law, tax rule, or health claim is not sourced, do not state it. Mark TODO.
6. **Never submit, pay, or send for the person.** Stop on the review page. The person confirms.
7. **Preview before change, plus undo.** Show what will happen. Keep a way to put things back.
8. **On-device first.** Prefer work on the person's phone or computer. No network calls in on-device tools.
9. **Privacy.** No real emails except `example.com`. No machine names, secrets, tokens, or private paths in the repo.

## Where things live

- Plan: `plan/`
- Brand: `brand/`
- Research: `research/`
- Tools / skills / site / app / cli / router: top-level folders with READMEs
- Checks and CI: `.github/workflows/` and `scripts/`
- Agent rules: this file. `CLAUDE.md` points here.

## How to run checks

From the repo root, after dependencies are installed:

```bash
npm test
# or the make target CI uses, once scripts land
```

CI must stay green on `main`. Do not weaken checks to pass.

## Definition of done

A change is done when:

1. Tests for the new behavior pass.
2. CI is green on the PR head.
3. The PR body has before and after proof (numbers, screenshots at phone size, or a recorded run).
4. Sources are listed for any factual claim.
5. No em dash or en dash characters appear in the diff.
6. Privacy scan is clean.

## Coding route

Do not hand-write code, configs, or CI in a chat session. Generate them with `codex exec` (preferred) or `claude -p` in the repo, non-interactively. Prose docs may be written directly.
