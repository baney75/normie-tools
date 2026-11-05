# New tools: cars, loans, and mortgages

Plan only. Nothing here is built or published, and the PDF is unchanged. Facts were checked November 4, 2026 (ET); sources are in `PLATFORM-SOURCES.md` under "Cars, loans, and mortgages".

**Goal: NT needs to be the greatest tools for normies.** These tools are for someone with no money or tech background who is about to buy a car, take a loan, or buy a home, and wants to understand the paper in front of them.

**Rules for all eight tools**
- NT explains and does exact math. It never gives financial advice, never says "take this loan", and never applies, signs, or sends anything for you.
- NT never makes up a rate, a price, a fee, or a car's value. Every number comes from your own paper (a quote, a Loan Estimate, a statement) or an official source, and NT shows where it came from.
- When NT can't tell you something, it says so plainly and points you to who can.
- Every tool follows `no-clutter-rule.md` (one step at a time, "Step 2 of 5", saves as you go) and `upload-errors.md` (clear messages when a file is wrong). Every result can be printed on one page (see `student-debt-save-print-sync-import.md`, Save and print).

Eight tools, grouped: Cars (3), Loans (2), Mortgages (3). A car loan is a loan, so the two Loan tools cover car loans too.

---

## CARS

### 1. Car Price Check
**What it does:** Shows the real total you'd pay for a car (the "out-the-door" price) and lists every extra charge to ask about.

**Who it's for:** Anyone buying a new or used car from a dealer.

**What you do**
1. Ask the dealer for the out-the-door price in writing, before you go. NT gives you a short message you can copy and send.
2. Take a photo of the quote or buyer's order, or type the lines in.
3. NT lists every line in plain words: the car's price, taxes, title and registration, the dealer's paperwork fee, and any add-ons.
4. Add-ons get a flag: "This is optional. You can say no." (Examples: GAP coverage, extended warranty, service contract, window etching, paint or fabric protection.)
5. If you have two quotes, NT lines them up side by side.

**What you get:** A one-page sheet: the total, each charge, which are optional, and the questions to ask. Plus a checklist for the day you buy: test drive, check for recalls, read the contract line by line, compare the contract to the written quote.

**NT never:** Guesses what a car "should" cost. Says a fee is illegal (rules differ by state; it says "ask what this is for" instead). Signs or agrees to anything.

**Official help:** FTC guidance says to get the out-the-door price in writing before you visit and that add-ons are optional; NHTSA's free recall lookup by VIN.

**For builders:** Quote reading uses Receipt to Spreadsheet's OCR path, then a line classifier (price, tax, government fee, dealer fee, add-on, rebate, trade-in credit). Classifier labels only; all sums in code with `Decimal`. Recall check links to nhtsa.gov/recalls with the VIN filled in; NT doesn't call or store results from the VIN tool. Add-on list is a fixed, reviewed list from FTC pages, not model output.

### 2. Trade-In Check
**What it does:** Helps you see what your current car is actually worth to you, using offers you collect, and shows how a trade-in changes the deal.

**Who it's for:** Anyone trading in or selling a car.

**What you do**
1. NT explains three ways to sell: trade in at the dealer, sell to a buying service, or sell it yourself.
2. You get written offers (NT gives you a checklist of what to ask). You type in each offer.
3. If you still owe money on the car, you enter the payoff amount from your lender's statement.
4. NT shows each offer side by side and what's left after paying off the loan. If you owe more than the offer, it says plainly: "You'd still owe $X. Many dealers add this to your new loan, which means paying interest on it."

**What you get:** A one-page comparison and a note that a trade-in should be a separate number from the new car's price.

**NT never:** Prices your car itself. If you have no offers yet, it says: "NT can't price your car. Get two or three written offers, or look up a free public pricing guide, and bring the numbers back here." Never picks an offer for you.

**For builders:** No pricing data is bundled or scraped. Inputs are the person's own offers and payoff amount. Negative equity = payoff minus offer, exact to the cent. The FTC "Buckle Up" staff report describes negative equity raising the amount financed; that's the source of the warning text.

### 3. Car Care Reminders
**What it does:** Turns your owner's manual service schedule into plain reminders, so oil changes, tire rotations, and recalls don't get missed.

**Who it's for:** Every car owner.

**What you do**
1. Tell NT your car's year, make, and model, and its current mileage.
2. Give NT the maintenance schedule page from your owner's manual (photo, PDF, or the maker's website).
3. NT turns it into a short list: what, every how many miles or months, and when it's next due.
4. Pick how you want reminders: calendar events, a printed sheet for the glove box, or none.
5. Check for open recalls with your VIN at NHTSA's free lookup (NT opens the right page).

**What you get:** A one-page schedule and optional calendar reminders.

**NT never:** Makes up a service interval. If it can't read the manual page, it says so and asks for a clearer copy. Never says a repair is unneeded.

**For builders:** Schedule extraction is checked against the source page (every interval must string-match the manual). Calendar output is .ics (RFC 5545). Mileage-based items need the person's odometer updates; NT asks monthly only if the person opts in (see `no-clutter-rule.md`, reminders). NHTSA's VIN search excludes repaired recalls, some recent recalls, recalls older than 15 years, and some small makers; the tool shows that note.

---

## LOANS

### 4. Loan Explainer
**What it does:** Reads your loan paper and explains every term in plain words: amount borrowed, interest rate, APR, term, monthly payment, total cost, fees, and anything risky.

**Who it's for:** Anyone with a car loan, personal loan, or other installment loan offer or contract.

**What you do**
1. Take a photo or upload the loan offer, or the "Truth in Lending" box on the contract.
2. NT shows one term at a time: what it says, what it means, and where it is on your paper.
3. Risky items get a flag with the reason: a prepayment penalty, a balloon payment, a variable rate, add-ons rolled into the loan.

**What you get:** A one-page summary in plain words, with each number pointing to the line it came from.

**Plain-words key:** *Interest rate*: what the lender charges each year to borrow the money, not counting fees. *APR*: the interest rate plus certain fees, as a yearly percent. It's the better number for comparing loans, as long as you compare APR to APR. *Term*: how long you pay. *Principal*: the amount you borrowed.

**NT never:** Fills in a number that isn't on your paper. Says whether you should take the loan.

**For builders:** Field extraction then string-match back to the source. Definitions are fixed text from CFPB pages, not generated. If APR is missing from a consumer loan, NT says "Lenders must show the APR before you sign (Truth in Lending Act). Ask for it."

### 5. Loan Offer Compare
**What it does:** Puts two to four loan offers side by side and shows what each one really costs over time, exact to the cent.

**Who it's for:** Anyone choosing between loan offers (car, personal, or other fixed-rate loans).

**What you do**
1. Type in or photograph each offer: amount, rate, APR, term, fees.
2. NT shows a table: monthly payment, total interest, total fees, and total paid.
3. Try "what if" changes: a shorter term, a bigger down payment, or an extra $50 a month. NT shows the new totals.
4. Open the full payment schedule for any offer: every payment, how much goes to interest, how much to principal.

**What you get:** A one-page comparison and a schedule you can print or save.

**Example (made up):** $20,000 at 6% for 60 months is $386.66 a month, with $3,199.35 in total interest (last payment $386.41).

**NT never:** Picks an offer for you. Uses a rate you didn't give it. Rounds in a way that hides cost (all math is exact to the cent and shown).

**For builders:** Standard amortization: monthly rate = APR rate / 12, payment rounded to the cent, interest each month rounded half-up to the cent, final payment trued up. APR is computed from amount financed (amount minus prepaid finance charges) by solving for the rate that makes the payments' present value equal the amount financed; shown next to the lender's APR. If they differ by more than 0.125 percentage point, NT says "Your APR differs from the lender's; ask them why" (it doesn't claim a violation). Variable-rate loans: NT shows the schedule only at today's rate and labels it.

---

## MORTGAGES

### 6. Mortgage Payment Explainer
**What it does:** Breaks your monthly mortgage payment into its parts so you see where each dollar goes.

**Who it's for:** Anyone with a mortgage, or looking at one.

**What you do**
1. Enter what you have: loan amount, rate, term, and your tax, insurance, mortgage insurance, and HOA amounts. Or upload a Loan Estimate or statement.
2. NT shows each part in plain words:
   - **Principal:** pays down what you borrowed.
   - **Interest:** the lender's charge.
   - **Property taxes** and **homeowner's insurance:** often collected monthly into an "escrow" account the lender pays from.
   - **Mortgage insurance (PMI):** protects the lender, not you. Often required when you put down less than 20%.
   - **HOA dues:** usually paid separately, not through the lender.
3. NT shows how the principal and interest split changes over the years.

**What you get:** A one-page breakdown, plus the PMI note: you can usually ask to remove PMI when you owe 80% of the home's original value, and it usually ends on its own at 78% if you're current (official details from CFPB).

**Example (made up):** $300,000 at 6.5% for 30 years is $1,896.20 a month for principal and interest. Taxes, insurance, PMI, and HOA are added on top.

**NT never:** Guesses your taxes or insurance. Blank stays blank with "ask your lender or county".

**For builders:** Same amortization engine as Loan Offer Compare. PMI dates computed from the original value and the schedule (80% request date, 78% automatic date), labeled "check with your servicer".

### 7. Loan Estimate Compare
**What it does:** Lines up official Loan Estimates from different lenders so you can compare them fairly.

**Who it's for:** Anyone shopping for a mortgage.

**What you do**
1. Ask two or three lenders for a Loan Estimate. NT explains: a lender must send one within three business days after you give six details (name, income, Social Security number, property address, estimated value, and loan amount).
2. Upload each Loan Estimate (the standard 3-page form).
3. NT lines up the key boxes: loan amount, rate, monthly payment, closing costs, cash to close, APR, and "In 5 Years" totals.
4. Flags with the reason: prepayment penalty, balloon payment, rate not locked, points.

**What you get:** A one-page side-by-side and a list of questions for each lender.

**NT never:** Calls a lender, applies, or locks a rate. Says which lender to pick.

**For builders:** Loan Estimate is a fixed federal form (TRID), so fields map by page and box. Every value is read from the form and string-matched back. If a page is missing, NT asks for it instead of guessing.

### 8. Closing Day Guide
**What it does:** Walks you through the last weeks before you get your keys, in order, and checks your Closing Disclosure against your Loan Estimate.

**Who it's for:** Anyone closing on a home.

**What you do (Step 1 of 5 and on)**
1. **Closing Disclosure.** You must get it at least three business days before closing. Upload it.
2. **Compare.** NT checks it against your latest Loan Estimate: name spelled right, loan amount, rate, monthly payment, closing costs, cash to close. Each difference is flagged: "This changed. Ask your lender why."
3. **The 3-day rule.** If the APR changes beyond the allowed amount, the loan type changes, or a prepayment penalty is added, a new 3-business-day wait starts. NT explains it plainly.
4. **Cash to close.** What it is and how you'll pay it.
5. **Wire-fraud warning.** Scammers send fake emails with "new" wiring instructions. Before wiring any money, call your settlement agent at a number you saved earlier, never one from the email. If something goes wrong, call your bank right away and ask for a wire recall, then report it at ic3.gov.

**What you get:** A one-page closing checklist (what to bring, who to call, numbers you saved) and the comparison.

**NT never:** Sends money or wiring instructions. Reads or follows wiring instructions from email. Tells you to sign.

**For builders:** Closing Disclosure is a fixed 5-page federal form; same box mapping as Loan Estimate. Business-day counter excludes Sundays and federal holidays (TRID definition for the 3-day rule; to confirm the exact holiday list used against 12 CFR 1026.2(a)(6) before launch). The wire-fraud panel is fixed text from CFPB and can't be turned off.

---

## New totals

- 8 new tools. The final count across all queued changes (89) and its breakdown are in `README.md`.

## Open items
- Some states cap or regulate dealer documentation fees; NT doesn't state limits until each state is verified.
- The business-day holiday list for the 3-day rule (see Closing Day Guide, For builders).
- A free public trade-in guide NT can link to, with its terms of use checked.
