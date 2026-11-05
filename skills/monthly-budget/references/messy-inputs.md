# Messy inputs

The script reads typed text the way a person writes it.

- "1,000", "$1,000.50" and " 12 " are fine. Spaces, a dollar sign and thousands commas are ignored.
- A blank amount means zero. That is how a prefilled line with no amount works.
- More than two decimals (such as "1.005") is not accepted. Ask the person to read the amount again.
- "1e3", words, emoji and NaN are not numbers. Ask again in plain words.
- A minus sign is not accepted. Money that comes in goes in the income list. Money that goes out goes in the spending list.
- A line with no name is called "Income line 2" or "Spending line 3", by its place in the list.
- More than $1,000,000,000 on one line is too big. More than 40 lines in a list is too many.
- With no income, there are no percents of income. Say so plainly and still give the totals.

Every bad entry comes back as a problem with a field name and a plain-words message that names the line. Read the message as it is. Never guess a number to make it work.
