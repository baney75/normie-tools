# How the Mortgage Payment Explainer works

Money is whole cents. A rate is whole basis points (hundredths of a percent): 6.5% is 650.
The person types every number. The tool has no rates and no tax rules of its own.

## Plain-words key

- Home price: what the home costs.
- Down payment: money you pay up front. It lowers the loan.
- Loan amount: home price minus down payment.
- Interest rate: the yearly price of the loan, as a percent of what you owe.
- Years: how long you have to pay the loan back.
- Principal: the part of a payment that lowers what you owe.
- Interest: the part of a payment that is the price of the loan.
- Principal and interest: the loan payment each month. It stays the same.
- Property tax: yearly tax on the home, as you typed it, split into 12 months.
- Home insurance: yearly insurance on the home, as you typed it, split into 12 months.
- HOA: a monthly fee some neighborhoods charge, as you typed it.
- Mortgage insurance: a monthly amount some loans add, as you typed it.
- Total interest: all the interest you pay over the whole loan.

## The formula

The standard fixed-rate loan formula.

- Loan amount L = price - down payment.
- Monthly rate i = yearly rate / 12. In basis points, i = bps / 120000.
- Principal and interest = L times i / (1 - (1 + i)^-n), where n is years times 12.
- At a rate of 0, it is L / n.

The script uses one exact fraction with whole-number math, so no float adds error:

`payment = L * B * (D + B)^n / ( D * ((D + B)^n - D^n) )`, with B = rate in basis points and D = 120000.

## Rounding

Round half up to the cent, at these steps only.

1. The principal-and-interest payment, once. It is never less than 1 cent.
2. Each month's interest = balance * i, rounded half up.
3. Monthly tax = yearly tax / 12, once.
4. Monthly insurance = yearly insurance / 12, once.

HOA and mortgage insurance are used as typed. The last loan payment is trued up so the loan ends at exactly 0.

## What each answer means

- Total monthly payment: principal and interest + tax + insurance + HOA + mortgage insurance.
- Total interest: the sum of each month's interest over the whole loan.
- First payment: interest = loan amount * i, rounded half up. Principal = payment - that interest.

## Limits

Price up to $1,000,000,000. Rate 0 to 100 percent, two decimals at most. 1 to 100 years.
It does not know about rates that change, closing costs, late fees, or tax changes. Only the lender's paper has those.
