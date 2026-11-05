# How Student Loan Growth and Payoff works

Money is whole cents. A rate is whole basis points (hundredths of a percent): 6.5% is 650.
This is an estimate. Real loans add interest each day. This tool uses one step a month.

## Plain-words key

- Loan balance: the money you owe now, not counting interest that builds up before you pay.
- Unpaid interest: interest that grew while no payments were made.
- Payments start: the month of your first payment, typed as YYYY-MM, like 2026-09.

## The steps

1. One month of interest = balance times rate / 12. In basis points, interest = balance times bps / 120000, rounded half up to the cent.
2. While waiting: unpaid interest = that one month * the months already past. It does not grow on itself.
3. Balance when payments start = loan balance + unpaid interest.
4. Toggle on (unpaid interest gets added to the balance when payments start): the unpaid interest joins the balance, then interest is figured on the bigger balance each month.
5. Toggle off: the unpaid interest stays apart. Interest keeps being figured on the first balance only.
6. Each payment first pays the unpaid interest and this month's interest. The rest lowers the balance.
7. The last payment is trued up, so the balance ends at exactly 0.

## Rounding

Round half up to the cent, once a month, at the interest step only.

## What each answer means

- Months to pay off: how many payments until the balance is 0.
- Total interest: total paid minus the first loan balance. It includes the interest that builds up before you pay.
- Payoff month: the payments-start month plus the months to pay off, minus one. Blank if no start month was typed.
- Smallest payment for N years: the smallest payment, to the cent, that pays the loan off in N * 12 payments. The last payment may be smaller. Found by trying payments with the same month-by-month steps.
- Year-by-year sections: each payoff year of 12 payments. Year 1 is the first 12 payments.
- A payment that does not pay the loan off in 100 years gets a plain message, not an answer.
