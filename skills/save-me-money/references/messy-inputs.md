# Messy inputs

The script reads typed text the way a person writes it.

- "1,000", "$1,000.50" and " 12 " are fine. Spaces, a dollar sign and thousands commas are ignored.
- A blank amount means the line is left out. A zero amount is also left out.
- More than two decimals (such as "1.005") is not accepted. Ask the person to read the amount again.
- "1e3", words, emoji and NaN are not numbers. Ask again in plain words.
- A minus sign is not accepted.
- How often must be week, month or year. Capital letters and spaces are fine. "Weekly", "daily" or blank is not accepted: ask which of the three it is.
- A line with no name is called "Cost 2" or "Cost 3", by its place in the list.
- More than $1,000,000,000 on one line is too big. More than 40 lines is too many.

Every bad entry comes back as a problem with a plain-words message that names the line. With --text it is a "Fix this first:" line. Read it as it is. Never guess a number to make it work.
