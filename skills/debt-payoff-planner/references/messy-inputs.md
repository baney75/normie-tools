# Messy inputs

The script reads typed text the way a person writes it.

- "1,000", "$1,000.50" and " 12 " are fine. Spaces, a dollar sign and thousands commas are ignored.
- "6.5" and "6.5%" both mean 6.5 percent.
- More than two decimals (such as "6.555") is not accepted. Ask the person to read it off the statement again.
- "1e3", words, emoji and NaN are not numbers. Ask again in plain words.
- Negative, zero or huge balances are not accepted. A balance must be above zero and at most $1,000,000,000.
- A row with nothing in it is skipped. A row with something in it needs a balance, a rate and a smallest payment. A rate of 0 is fine.
- A blank extra amount means none.
- More than 6 debts is not accepted. Ask which 6 to use.
- A name is only a label. If it is blank, the debt is called "Debt" and its row number.

Every bad entry comes back as a problem with a field name (such as balance2) and a plain-words message that names the debt. Read the message as it is. Never guess a number to make it work.

If a smallest payment does not cover the first month's interest, say so plainly. Do not make up a payoff date.
