# Columns

The CSV has a header row and these columns, in this order.

| Column | Meaning |
|---|---|
| date | Day of purchase as YYYY-MM-DD, or blank if unreadable |
| store | Store name as printed |
| item | What was bought |
| price | Amount like 3.49 or -1.00 for a refund. Two decimals at most |
| check | "check this" when the line was hard to read, else blank |

Money rule: the script turns each price into whole cents before adding. It never adds decimals. A price with more than two decimals is rejected and marked "check this".
