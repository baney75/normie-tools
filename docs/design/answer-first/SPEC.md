# Answer first: NT redesign spec

Owner ask (2026-11-05): "NT tools currently sucks please fix it." "Like the whole thing is crap."

The built result is in this folder as `after-*.webp` (phone 390px and desktop 1280px), beside `before-*.webp` from the live site on 2026-11-05. The brand tokens in `site/src/styles/tokens.css` and the existing fonts are unchanged.

## What is wrong now

- Home lists 80 tools. 74 say "Coming soon". Every icon is a wrench. It is 9,272px tall on a phone.
- Tool pages carry filler written for the grading bots, not people. Examples: "There is no Send button on this page." "Tap it again to swap back." "Start over asks first, and you can undo it right after." "Remove asks first and shows which line goes. Put it back undoes it." "That is your answer. You can stop here..." "Tap a box with a list to see your choices."
- Each answer sits at the bottom behind a placeholder "Your answer shows here" box with a fake "Show my answer" button.
- Hints are long ("On your loan paper. Look for the words ... For example: 12000.").
- The first box gets focus on load with an orange ring that looks like an error.

## Change

### Home (`site/src/pages/Home.tsx`, `ToolGrid`, `PromptSearch`)

1. Hero: h1 "Small tools for everyday things." One line: "Free. No sign up. Your numbers stay on this phone." Then the search box.
2. Below it, only the shipped tools (status `shipped` in `site/public/tools.json`), as a plain list of rows like `A-home.html`. Each row has a tool icon in a mint square, the plain question as the bold title, the tool name as a small muted line, and an arrow. The whole row is one link.
3. Add a `question` field and an `icon` field (a lucide-react icon name) to each tool in `site/public/tools.json`. Use these questions for the shipped tools:
   - monthly-budget: "Where does my money go each month?" (Wallet)
   - loan-explainer: "What will my loan cost?" (CreditCard)
   - loan-offer-compare: "Which loan offer is cheaper?" (Scale)
   - mortgage-payment-explainer: "What will my house payment be?" (House)
   - student-loan-growth-and-payoff: "When will my student loan be paid off?" (GraduationCap)
   - unit-converter: "Change cups, inches, pounds and more" (Ruler)
   Coming-soon tools may leave `question` empty. Pick a fitting lucide icon for each anyway; no tool keeps the generic wrench.
4. Coming-soon tools leave the home page. One quiet line under the list: "More tools are on the way. See what is coming" links to a new route `#/coming`. That page lists coming-soon tools by category as plain text lists, no badges, no cards.
5. Search still finds every tool. A coming-soon match says "Not ready yet" in plain text and links to `#/coming`.

### Tool pages (all six shipped tools, through the shared `components/calc` pieces where possible)

1. Kicker line with the tool name, then h1 = the tool's question.
2. The answer card comes first on a phone and sits in a sticky right column at 900px and wider (inputs left). It uses the ink green background, white text, and one big number in the display font with a short unit ("a month"). Under it: one plain sentence, then at most two key numbers. Everything else (year-by-year table, "What the words mean", the facts used) goes in quiet disclosures below the inputs.
3. Boxes start empty. The waiting card shows only one calm line, like "Type your numbers to see your monthly payment." (Monthly Budget: "Type your pay to start."). Under the question, every tool shows "Your numbers stay on this phone or computer." with a "How we know" link to a short page that names the code as the source.
   After the boxes, a "See my payment" style button is the one main button while there is no answer. It puts the cursor in the first empty box. It goes away once there is an answer, and it hides on wide screens where the answer sits beside the boxes.
   We first tried opening with example numbers already typed. The first-time reader scored it 3 of 5: it could not tell whether the numbers were its own or whether to tap the button first. Empty boxes scored 4. A saved copy still offers "Use your last numbers?".
4. Loan length uses chips (2, 3, 4, 5 years, and Other, which shows a number box) where the tool asks for a term. Keep the months/years logic correct.
5. Optional inputs (fees, extra payments) sit behind one quiet button, "Add fees or extra payments", which opens them in place.
6. Delete the filler: `PrivacyNote` text, the Start over hint line, `removeHint` lines, `swapHint`, "Tap a box with a list...", "That is your answer. You can stop here...", "Done. Back to home." and "Change a number". Delete the `StepLabel` "Step 1 of 2" lines on single-screen calculators. Keep the behaviors (Start over asks first and offers Put it back, Remove offers Put it back); only the sentences explaining them go.
7. Hints: one short line at most, only where a person needs to find the number. For example "On your loan papers." No "For example: 12000." (the example numbers do that job now).
8. No autofocus on load. Keep a visible focus ring, in ink green, not orange.
9. Exactly one filled button per page: the "See my ..." button before there is an answer. With an answer: the line "That is your estimate. You can stop here, or change a number to try again." ("answer" for the exact tools), a filled "I'm done" link back to home, and a plain "Print or save" button that opens the existing `SavePrintSheet` in place. Start over sits behind a closed "More options", with "You can put your numbers back." beside it.
10. Monthly Budget rows are compact: name and amount on one line (they stack only under 360px), and remove is an icon button labeled `Remove <name>` for screen readers.
11. Keep the money math untouched (`tools/*/calc.mjs`). Keep the estimate line ("This is an estimate...") but shorten it to one sentence.

## Must not happen

- No changes to `tools/*/calc.mjs`, `tools/*/tests/`, skills, the ship gate, the evidence gate, or the review prompts.
- Do not weaken or delete a test to make it pass. Update a test only where it asserts the old copy or the old layout, and keep what it was really checking.
- No em dash or en dash characters. No new dependencies besides what is already in `site/package.json`.

## Done check (all must pass in this worktree)

```bash
npm test
npm run test:site
npm run build
npm run test:e2e --workspace @nt/site -- --project=chromium
```

Then write `docs/design/answer-first/RESULT.md` with the commands and their pass counts, the list of files changed, and anything you could not do.
