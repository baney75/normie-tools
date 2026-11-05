# Messy inputs

The script reads typed text the way a person writes it.

- "1,000", "$1,000.50" and " 12 " are fine. Spaces, a dollar sign and thousands commas are ignored.
- "6.5" and "6.5%" both mean 6.5 percent.
- More than two decimals (such as "6.555") is not accepted. Ask the person to read it off the paper again.
- "1e3", words, emoji and NaN are not numbers. Ask again in plain words.
- Negative, zero or huge amounts are not accepted. The amount must be above zero and at most $1,000,000,000.
- A blank amount, rate or term means the person has not said yet. Ask for it. A blank fee or extra payment means none.
- A term must be a whole number: 1 to 1,200 months, or 1 to 100 years. "2.5 years" is not accepted; use 30 months.
- A rate of 0 is fine. Say there is no interest.

Every bad entry comes back as a problem with a field name and a plain-words message. Read the message as it is. Never guess a number to make it work.
