# How the Debt Payoff Planner works

Money is whole cents. A rate is whole basis points (hundredths of a percent): 19.99% is 1999.

## Plain-words key

- Balance: what you owe on a debt today.
- Yearly interest rate: the yearly price of the debt, as a percent of what you owe.
- Smallest payment: the least the lender asks for each month.
- Extra each month: money you add on top of all the smallest payments.
- Snowball: pay extra money toward the smallest balance first.
- Avalanche: pay extra money toward the highest rate first.

## The month, step by step

Each month, in this order:

1. Every debt that still has a balance gets its interest added: interest = balance * rate / 12.
2. Every such debt gets its smallest payment (or what is left, if that is less).
3. The rest of the month's money goes to the first open debt in the plan's line. If that debt is cleared, what is left goes to the next one.

The month's money stays the same all along: every starting smallest payment added up, plus the extra. So when a debt is cleared, its smallest payment rolls into the next debt. Once every debt is cleared, the plan is done. The last month may need less than the full amount.

## Rounding

Round half up to the cent at one step only: each month's interest on each debt. In whole numbers: interest = (2 times balance times bps + 120000) // 240000. Payments are already whole cents.

## The two lines

The line is set once, from the starting numbers.

- Snowball: smallest balance first.
- Avalanche: highest rate first.
- A tie goes to the debt typed first.

## What each answer means

- Months to debt-free: the month number when the last balance reaches zero.
- Total interest: every month's interest added up, for every debt.
- Total paid: the starting balances plus the total interest.
- Order of payoff: each debt and the month it reaches zero. Debts that reach zero in the same month are listed in line order.
- Difference: how many months apart the two plans are, and how many dollars of interest apart. Only the facts. This tool does not say which plan to use.

## Stops and limits

- If a debt's smallest payment is not more than its first month's interest, that debt never goes down on its smallest payment. The tool says so and works out nothing.
- If a plan would pass 1,200 months (100 years), the tool stops and says so.
- Up to 6 debts. Balance and smallest payment up to $1,000,000,000. Rate 0 to 100 percent, two decimals at most.
- It does not know about late fees, a rate that changes, new charges, or a lender's own rounding. Only the lender's paper has those.
