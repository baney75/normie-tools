# One question per phone screen

Owner, 2026-11-05: "Each tool needs to be one page and extremely easy to use." Asked what "one page" means, he answered "One phone screen with continue buttons".

Every shipped tool is now a short flow built with `site/src/components/calc/StepFlow.tsx`. Each question screen fits a 390 by 664 phone screen (an iPhone 15 in Safari, browser bars showing) with no scrolling.

## How a step screen works

- The top row shows the tool name and "Step N of M". Under it is one short bar per screen: done bars are green, the current one is tomato, the rest are pale. A person can count what is left at a glance. A `<progress>` element under the bars gives screen readers the same count.
- The heading (h1) is the step's question. One-box steps keep the box label for screen readers only, because the heading already asks the question.
- Step 1 shows the trust line with a lock right under the question: "Your numbers stay on this phone or computer." with a "How we know" link. Above Continue it says "You can go back and change any number.", because readers asked whether Continue locks a number in. The trust line was tried by the button and under the box: Haiku then failed it as an unsourced claim (rule 8) on 4 of 6 tools, and passed it 5 of 5 under the question. "Free. No sign up." was tried in front of it and failed rule 8 the same way.
- A box shows its "$" or "%" inside its own frame, so it reads as one money or percent box. The first-time reader called the old box, with "$" floating outside it, "a blank box with no label".
- Choices (loan length, months or years, what you are measuring) are equal tiles, two to a row, each with a ring that fills when picked, so the pick shows by shape as well as color.
- On the answer screen, the optional boxes (fees, tax and insurance, school months) wait inside the same closed "More options" as Start over, so the answer has one quiet extra, not two. It opens by itself when one of its boxes has a red note.
- Monthly Budget's first step is one money box while there is one income ("Your pay for one month, after taxes."). The list with names and Remove buttons shows once a second income is added. The reader scored the old list 3 on all 9 runs and the one box 4.
- The buttons sit at the bottom of the phone on every step, in the same place, within thumb reach. The question screen fills the space under the logo (a flex column), so short steps leave the gap between the box and the buttons, not under the buttons. A long step (Monthly Budget with many lines) scrolls under them.
  - **Continue** (on the last step, the tool's own words, for example "See my payment") is the one filled button. It is a form submit, so Enter works too.
  - **Back** is a quiet link. On step 1 it is "Back to tools" and goes home.
- Tapping Continue before the step is ready shows one plain line (the step's `missing` text) and puts the cursor on the box that needs fixing. When the step is ready, the next screen opens at the top with the cursor in its first box. Nothing gets focus on first load.
- The step number is kept with the autosaved numbers (`useAutosave` step), so "Use them" brings back the step too.

## The answer screen

- The screen shows the tool name, the tool's question as the h1, and the answer card.
- Under the card, Finish shows "That is your estimate." ("answer" on Monthly Budget and Unit Converter), a filled "I'm done" link home, and a plain "Print or save" button.
- Next comes a "Change my numbers" quiet button, which goes back to step 1.
- The extras follow: the optional boxes (fees, extra payment, tax and insurance, school months), the third offer, and Start over inside "More options". Start over that clears everything also returns to step 1.
- Detail sits in closed sections below, as before.

## Steps per tool

| Tool | Steps | Last button |
|---|---|---|
| Loan Explainer | How much did you borrow? / What is the yearly interest rate? / How long is the loan? (chips, Other) | See my payment |
| Mortgage Payment Explainer | What does the home cost? / How much will you pay at the start? / What is the yearly interest rate? / How long is the loan? | See my payment |
| Student Loan Growth and Payoff | How much do you owe? / What is the yearly interest rate? / How much do you pay each month? (optional) | See my answer |
| Loan Offer Compare | Offer N: how much, at what rate? / Offer N: how long, and any fees? (two steps per offer; "Add a third offer" on the answer screen adds steps 5 and 6) | See which costs less |
| Monthly Budget | How much money comes in each month? / What do you spend? (with the Remove note) | See what is left over |
| Unit Converter | What are you measuring? (chips) / Type the number (Number and From on one row, To, Swap) | See my answer |

Loan Offer Compare's answer card shows each offer's interest and fees. The monthly payments are in "See all the numbers".

The site footer is not shown on tool pages, so the flow has no extra links.
