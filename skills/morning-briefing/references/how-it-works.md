# How the briefing is built

The person picks parts: weather, news headlines, my day, my reminders. They always appear in that order.

- **Date.** The person gives it as `2026-11-05`. The script prints `Thursday, November 5, 2026`. It never reads the clock. With no date, the date line is left out.
- **My day.** Up to 5 items, each with a time text and a title. Items with a clear time are sorted by time. Items with the same time keep the order typed. Items with no clear time go under "Time not clear", in the order typed.
- **My reminders.** Up to 5. Blank ones are dropped.
- **Weather and news.** These are made-up Example lines from a fixed set. They say "Example. Not today's weather." and "Example. Not today's news." They are not real. The script does not use the internet.
- **The offline line.** When weather or news is picked, the briefing ends with: "Live weather and news are not on this page yet."

## Clear times

7:30 am, 7:30am, 7am, 7 a.m., 13:05, 07:30, noon, midnight, 12 am (midnight), 12 pm (noon).

Not clear: 7:30 (am or pm?), 10:00, 13, later, 25:00, 7:75 am. These are listed under "Time not clear". Ask the person if they want to fix them.

## Output

`--text` prints one fact per line, then a final line starting with "Note:". Problems print as lines starting with "Fix this first:". Without `--text` the output is JSON with `ok`, `sections`, `notes` and `text`.

## Real weather and news

The script has none. If the person asks for real weather or news, use your own tools, say where each fact came from, and keep it apart from the Example lines. Never invent it.
