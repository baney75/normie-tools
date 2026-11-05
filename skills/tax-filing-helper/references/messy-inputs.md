# Messy inputs

| What the person typed | What happens |
|---|---|
| Extra spaces or capitals in a word | Still matches. |
| `$32,450`, `32450` or `32,450.00` for money | All the same amount. They match. |
| `2810.5` | Same as `$2,810.50`. |
| `12.3` when the sheet says `12.34` | Different. The line says what was typed and what the sheet says. |
| `lots`, `1e3`, an emoji | Not a dollar amount. The line says so. |
| A minus sign on money | Different. It is a different amount. |
| Nothing | "Nothing typed yet." |
| A very long answer | Shown cut short. Still compared in full. |

The check never gives NaN, never crashes, and never guesses an answer for the person.
If the answer sheet itself is broken, the output starts with "Fix this first:".
