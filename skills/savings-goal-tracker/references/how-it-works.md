# How the Savings Goal Tracker works

Money is whole cents. A rate is whole basis points (hundredths of a percent): 4.5% is 450.

## Plain-words key

- Goal: the amount you want to have saved.
- Already saved: what you have now.
- Saved each month: the money you add at the end of every month.
- Yearly interest rate: what your savings earn in a year. Leave it empty or type 0 for none.
- Start month: the month you begin saving, typed like 2026-12.

## The rule for each month

Every month works the same way:

1. Interest = balance x yearly rate / 12. In basis points, interest = balance x bps / 120000.
2. Round the interest half up to the cent. This is the only rounding.
3. Add the interest to the balance.
4. Add the monthly amount.

Month 1 is the start month. If the goal is met at the end of month k, it lands in the start month plus k - 1 months. With no start month, only the number of months is shown.

## Months to reach the goal

Repeat the monthly rule until the balance is at least the goal. The count is the answer. If you have already saved the goal, the answer is 0 months. If you save nothing each month and the rate is 0, the goal will not be reached. The tool counts up to 1,200 months (100 years). Past that it says so.

## Monthly amount for a chosen month

The months are counted from the start month to the goal month, both included. The tool finds the smallest whole-cent monthly amount whose balance, using the same monthly rule, is at least the goal in the last month.

## Limits

- Real accounts can pay interest by other rules (daily, or on the lowest balance). This tool uses the rule above and is an estimate.
- It does not know about taxes, fees, or changes in the rate.
- It does not tell you how much to save. It shows the numbers you typed.
