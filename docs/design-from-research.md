# Design from research

Each rule below comes from a checked source in `research/`. Each row names the research file, the source, the component that enforces the rule, and the test that proves it. Components and tests now exist under `site/`. Any path that differs from the first plan is corrected below. Rows marked "later" are not built yet.

Rule files: `plan/v5-work/no-clutter-rule.md` and `plan/v5-work/upload-errors.md`. Source rules: `research/SOURCES-RULES.md`.

## How to read the table

- **Finding** is what the source says, in our words.
- **Source** is a page that was opened and checked on the date in the research file.
- **Component** is where the rule lives in code.
- **Test** is the check that fails if the rule breaks. Browser tests live in `site/e2e/`. A spec marked later is not written yet.

## A. No clutter and one main action

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| One main thing per screen, one main button | Extra interface work uses up working memory and can make people quit | `research/attention-and-cognitive-load.md`: Nielsen Norman Group, "Minimize Cognitive Load to Maximize Usability" | `site/src/components/ScreenFrame.tsx` | `site/src/components/ScreenFrame.test.tsx` (one primary button) |
| Extra options sit behind one "More" button | Cutting extraneous load leaves attention for the real task | `research/neurodivergence-adhd-and-design.md`: Nielsen Norman Group, same article | `site/src/components/MoreMenu.tsx` | `site/src/components/MoreMenu.test.tsx` |
| Ask only for what is needed | Ask only for what you need, make errors easy to fix, support undo and saved progress | `research/why-people-abandon-forms-and-apps.md`: W3C COGA, "Making Content Usable for People with Cognitive and Learning Disabilities" | `site/src/components/ToolGrid.tsx`, `site/src/components/PromptSearch.tsx` | `site/e2e/home-one-action.spec.ts` (later, browser phase) |
| Remove effort before simplifying it | Eliminate, automate, then simplify what remains | `research/why-people-abandon-forms-and-apps.md`: Nielsen Norman Group, "Less Effort, More Completion: The EAS Framework for Simplifying Forms" | `site/src/components/Stepper.tsx` | `site/src/components/Stepper.test.tsx` |
| Short paragraphs and lists | Easy words, short sentences and blocks | `research/plain-language-and-reading-level.md`: W3C COGA | all page copy, checked by `npm run check:no-clutter` | `scripts/tests/check-no-clutter.test.mjs` (exists) |

## B. Short attention: "Step N of M"

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| Say "Step 3 of 7" in words, with a progress bar | Help people focus, and restore context after an interruption | `research/attention-and-cognitive-load.md`: W3C COGA | `site/src/components/Stepper.tsx` | `site/src/components/Stepper.test.tsx` (text and progress name) |
| Show how many steps before starting | Avoid processes that depend on memory | `research/attention-and-cognitive-load.md`: W3C COGA | `site/src/components/Stepper.tsx` | `site/e2e/stepper-intro.spec.ts` |
| One step asks for one thing | When mental demand exceeds capacity, people miss details or quit | `research/why-people-abandon-forms-and-apps.md`: Nielsen Norman Group, "Minimize Cognitive Load" | `site/src/components/Stepper.tsx` | `site/src/components/Stepper.test.tsx` |

## C. Neurodivergent-friendly: no timers, calm motion, autosave, where you are

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| Autosave every answer on the device | Help users avoid mistakes and avoid memory-heavy processes | `research/neurodivergence-adhd-and-design.md`: W3C COGA | `site/src/lib/useAutosave.ts`, `site/src/components/ResumePrompt.tsx` | `site/src/lib/useAutosave.test.ts`, `site/e2e/autosave-resume.spec.ts` |
| "Pick up where you left off" | Restore context after an interruption | `research/attention-and-cognitive-load.md`: W3C COGA | `site/src/components/ResumePrompt.tsx` | `site/e2e/autosave-resume.spec.ts` |
| "Where you are" summary, one tap away | Show completed, current, and pending steps | `research/neurodivergence-adhd-and-design.md`: W3C COGA | `site/src/components/WhereYouAre.tsx` | `site/src/components/WhereYouAre.test.tsx` |
| No timers that rush the person | Predictable operation and help recovering from mistakes support lower digital skill | `research/digital-literacy-levels.md`: W3C, "Web Content Accessibility Guidelines (WCAG) 2.2" | `site/src/lint/noTimers.ts` (no timers, autoplay, `alert`, or `confirm` in source) | `site/src/lint/no-timers.test.ts` |
| Reduce motion when the device asks | Predictable operation (WCAG 2.2) | `research/digital-literacy-levels.md`: W3C WCAG 2.2 | `site/src/styles/motion.css` | `site/e2e/reduced-motion.spec.ts` |
| No layout jumps while loading | Predictable operation (WCAG 2.2) | `research/digital-literacy-levels.md`: W3C WCAG 2.2 | `site/src/components/ScreenFrame.tsx` (reserved space) | `site/e2e/layout-shift.spec.ts` (later, browser phase) |
| Calm, specific errors | Make errors easy to fix | `research/why-people-abandon-forms-and-apps.md`: W3C COGA | `site/src/components/CalmMessage.tsx` | `site/src/components/CalmMessage.test.tsx` |
| Reminders only if asked | The person controls when and how often | `research/neurodivergence-adhd-and-design.md`: W3C COGA (personalization) | none this round | none this round |

## D. Plain language

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| About grade 6 reading level | Write for the audience, use active voice, lists, and clear structure | `research/plain-language-and-reading-level.md`: Digital.gov, "Principles of plain language" | all person-facing copy in `site/src/copy/` | `npm run check:reading-level`, `npm run check:jargon` |
| No builder words | Many adults read at a low level on screens: 28% of U.S. adults ages 16 to 65 were at literacy Level 1 or below in 2023 | `research/digital-literacy-levels.md`: NCES, "Highlights of the 2023 U.S. PIAAC Results" | `docs/glossary.md` list, enforced by `scripts/check-banned-jargon.mjs` | `scripts/tests/check-banned-jargon.test.mjs` (exists) |
| Preview before change, with undo | Familiar patterns cut the learning burden that feeds tech anxiety | `research/tech-anxiety-and-self-efficacy.md`: Nielsen Norman Group, "Minimize Cognitive Load" | `site/src/components/SavePrintSheet.tsx` (preview step) | `site/src/components/SavePrintSheet.test.tsx` |
| Never rush, stop before submit or pay | Money tools must show a preview and stop before submit | `research/trust-scams-and-fraud.md` (context only; the FTC figures are TODO and not used) | `site/src/components/ReviewStop.tsx` | `site/src/components/ReviewStop.test.tsx` |
| Money stress shrinks attention, so keep money screens short | Scarcity overloads mental bandwidth | `research/financial-literacy-and-money-stress.md`: Harvard IQSS summary of Mullainathan and Shafir | `site/src/components/ScreenFrame.tsx` | `site/e2e/money-screen-length.spec.ts` (later, browser phase) |

## E. Upload errors: four parts

Follow `plan/v5-work/upload-errors.md` exactly. Every mismatch message has: what you gave, what is needed, what that is in plain words, and how to get it.

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| Detect the real type from the file bytes, not the name | Make errors easy to fix | `research/why-people-abandon-forms-and-apps.md`: W3C COGA | `site/src/lib/detectFileType.ts` | `site/src/lib/detectFileType.test.ts` (magic bytes, renamed files) |
| Four-part message, one table of text | Make errors easy to fix; plain language | `research/plain-language-and-reading-level.md`: W3C COGA | `site/src/components/UploadField.tsx`, `site/src/copy/upload-messages.ts` | `site/src/components/UploadField.test.tsx`, `site/e2e/upload-error-contract.spec.ts` |
| Offer a safe alternative as one button, preview first | Support undo and saved progress | `research/why-people-abandon-forms-and-apps.md`: W3C COGA | `site/src/components/UploadField.tsx` | `site/src/components/UploadField.test.tsx` |
| At most two buttons, other answers kept | Cutting extraneous load | `research/attention-and-cognitive-load.md`: Nielsen Norman Group | `site/src/components/UploadField.tsx` | `site/e2e/upload-error-contract.spec.ts` |
| No blame in wording | Calm, specific errors | `research/tech-anxiety-and-self-efficacy.md`: Wild et al. (2012) | `site/src/copy/upload-messages.ts` | `site/src/copy/upload-messages.test.ts` (reading level, no "you uploaded") |

## F. Phone first, iPad, container queries, readable width

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| Design at 390px first | 90% of U.S. adults had a smartphone in the 2023 survey; 15% were smartphone-dependent, and 28% in households under $30,000 | `research/mobile-first-behavior.md`: Pew Research Center, "Americans' Use of Mobile Technology and Home Broadband" | `site/src/components/Shell.tsx` | `site/e2e/viewport-matrix.spec.ts` (390px screenshot, no sideways scroll) |
| Banking and money tasks happen on phones | 81% of U.S. adults use a mobile device to reach checking or savings accounts | `research/mobile-first-behavior.md`: FINRA Foundation NFCS 6th Edition | `site/src/components/Shell.tsx` | `site/e2e/viewport-matrix.spec.ts` |
| Large tap targets, patient pacing | Older adults are less likely to own a smartphone or be online almost constantly | `research/older-adults-and-technology.md`: Pew Research Center, same 2024 report | `site/src/styles/tokens.css` (44px minimum target) | `site/e2e/tap-targets.spec.ts` (later, browser phase) |
| Container queries, not screen width | Engineering choice. Research supports phone first and calm layout; no source in `research/` covers container queries, so none is claimed. See `docs/decisions.md` | `research/mobile-first-behavior.md` | `site/src/styles/container.css`, `site/src/components/Shell.tsx` | `site/e2e/viewport-matrix.spec.ts` (iPad mini, iPad Air, Split View 1/3) |
| Maximum readable width on wide screens | Engineering choice. TODO: open a source for line length before claiming a number | `research/plain-language-and-reading-level.md` | `site/src/components/Shell.tsx` | `site/e2e/viewport-matrix.spec.ts` (1280, 1920) |
| "Where you are" side panel only on wide screens | Same finding as section C, placed so a phone stays one column | `research/neurodivergence-adhd-and-design.md`: W3C COGA | `site/src/components/WhereYouAre.tsx` | `site/e2e/viewport-matrix.spec.ts` |

## G. Ship gate and coming soon

| Rule | Finding | Research file and source | Component | Test |
|---|---|---|---|---|
| Show a tool as usable only if it passed every bar | People who doubt they can do computers quit early; a broken tool confirms the doubt | `research/tech-anxiety-and-self-efficacy.md`: Wild et al. (2012) | `site/src/components/ComingSoonBadge.tsx`, `site/public/tools.json` | `scripts/tests/ship-gate.test.mjs`, `site/src/components/ComingSoonBadge.test.tsx` |

## Gaps

- Line length for readable width: no checked source yet.
- Container queries: an engineering choice, not a research finding.
- Scam and fraud figures: the FTC pages did not open, so no figure is used.
- An ADHD-specific usability study: TODO in `research/neurodivergence-adhd-and-design.md`.
