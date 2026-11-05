# Messy inputs

The script reads typed text the way a person writes it.

- "1,000", "$1,000.50" and " 12 " are fine. Spaces, a dollar sign and thousands commas are ignored.
- "6.5" and "6.5%" both mean 6.5 percent. More than two decimals (such as "6.555") is not accepted.
- "1e3", words, emoji and NaN are not numbers. Ask again in plain words.
- Negative, zero or huge balances are not accepted. The balance must be above zero and at most $1,000,000,000.
- A blank balance or rate means the person has not said yet. Ask for it.
- A blank months-past means 0. It must be a whole number from 0 to 600.
- A blank payment means no payoff answer yet. The balance when payments start is still shown.
- A payment too small to pay the loan off in 100 years is not accepted. Say so, and ask for a bigger number to look at.
- The start month must look like 2026-09: four digits for the year (2000 to 2200), a dash, two digits for the month (01 to 12). Blank means no payoff month.
- Years to pay off must be a whole number from 1 to 100. Blank means skip it.
- A rate of 0 is fine. Say there is no interest.

Every bad entry comes back as a problem with a field name and a plain-words message. Read the message as it is. Never guess a number to make it work.
