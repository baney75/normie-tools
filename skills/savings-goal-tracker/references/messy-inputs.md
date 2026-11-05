# Messy inputs

Read the typed text exactly. Never guess a number the person did not give.

| Typed | Result |
| --- | --- |
| `1,000` | 100000 cents |
| `$1,000.50` | 100050 cents |
| ` 12 ` | 1200 cents (spaces are fine) |
| `1e3`, `lots`, emoji, `NaN` | Not a number. Ask again in plain words. |
| `-5` | Below zero. Ask again. |
| `0` goal | Not allowed. A goal is above zero. |
| `0` saved each month | Allowed. Say it will not reach the goal unless there is interest. |
| blank saved | Counts as 0. |
| blank rate | Counts as 0. |
| more than two decimals | Not allowed. Ask for cents. |
| `2026-12` | December 2026. |
| `2026-1`, `2026/12`, `Dec 2026`, `2026-13` | Not a month. Ask for the year, a dash, then two digits for the month. |

Other rules:

- A goal month before the start month is not allowed.
- A goal month more than 1,200 months after the start month is not allowed.
- A goal above $1,000,000,000 is too big for this tool.
- A bad entry gets one calm sentence that names the field.
