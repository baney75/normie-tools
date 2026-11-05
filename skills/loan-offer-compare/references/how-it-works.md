# How the Loan Offer Compare works

Money is whole cents. A rate is whole basis points (hundredths of a percent): 6.5% is 650.

## Plain-words key

- Amount borrowed: the money you get from the lender, before any interest.
- Interest rate: the yearly price of the loan, as a percent of what you owe.
- Length: how long you have to pay it back.
- Upfront fees: money you pay at the start.
- APR: shown on the lender's paper. This tool does not work it out.

## The formula (for each offer)

This is the standard fixed-rate loan formula.

- Monthly rate i = yearly rate / 12. In basis points, i = bps / 120000.
- Monthly payment = P * i / (1 - (1 + i)^-n), where P is the amount borrowed and n is the number of months.
- At a rate of 0, the payment is P / n.

The script uses one exact fraction with whole-number math, so no float adds error:

`payment = P * B * (D + B)^n / ( D * ((D + B)^n - D^n) )`, with B = rate in basis points and D = 120000.

## Rounding

Round half up to the cent, at two steps only.

1. The monthly payment, once, from the exact fraction. It is never less than 1 cent.
2. Each month's interest = balance * i, rounded half up.

The last payment is trued up. It is the balance left plus that month's interest, so the balance ends at exactly 0.

## What each answer means

- Monthly payment: the level payment each month.
- Total paid: the sum of every payment. Upfront fees are not in it.
- Total interest: total paid minus the amount borrowed.
- Cost of borrowing: total interest plus the upfront fees typed.

## Lowest, and ties

- Lowest cost of borrowing: the offer with the smallest cost of borrowing.
- Lowest monthly payment: the offer with the smallest monthly payment.
- These can be different offers. Both are facts about the numbers typed. Neither one is advice, and no offer is called "best".
- When two or three offers share the lowest number, every one of them is named. The tool does not pick between them.
- `sameAmountAndLength` is false when the offers differ in amount or length. Totals then measure different loans.

## Limits

Two or three offers. Amount up to $1,000,000,000. Rate 0 to 100 percent, two decimals at most. Length 1 to 1,200 months or 1 to 100 years.
It does not know about late fees, a rate that changes, balloon payments, or add-ons. Only the lender's paper has those.
