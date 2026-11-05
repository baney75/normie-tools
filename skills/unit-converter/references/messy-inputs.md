# Messy inputs

The script reads typed text the way a person writes it.

- "1,000", " 12 " and "12." are fine. Spaces around the number and thousands commas are ignored.
- ".5" means 0.5. "0012" means 12.
- "1e3", words, emoji, NaN, "$5" and "5%" are not numbers here. Ask again in plain words.
- A second dot ("1.2.3") or commas in the wrong place ("1,00,0") are not accepted.
- More than 12 digits before the dot, or more than 9 after it, is too much for this tool.
- A negative number is only fine for temperature. For other kinds, say it needs zero or more.
- A temperature below absolute zero is not accepted.
- A blank number means the person has not said yet. Ask for it.
- A unit that is not in the chosen kind (like "pound" for length) is not accepted. Ask which unit they mean.
- The same unit twice is allowed. The answer is the number, rounded to 6 digits.

Every bad entry comes back as a problem with a field name and a plain-words message. Read the message as it is. Never guess a number to make it work.
