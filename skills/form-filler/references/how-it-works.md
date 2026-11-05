# How Form Filler works

Every fact here comes from IRS.gov, as written in the NT plan for Form Filler (checked November 4, 2026). Source: the IRS Free File page, https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free

## The four questions

1. Are you filing this year's taxes? Free File only does this year's taxes.
2. Was your income $95,000 or less last year? The IRS calls this number adjusted gross income, or AGI. Last season that was the limit for Guided Free File. For this year's limit: Check IRS.gov.
3. Are you willing to type into online copies of the IRS forms yourself? That is Free File Fillable Forms. It works at any income.
4. Is Free File open yet? When checked on November 4, 2026, it was closed. The IRS says it opens in January 2027. Check IRS.gov.

## Which way may fit

| Answers | Result |
|---|---|
| Not filing this year's taxes | Free File does not fit. Check IRS.gov. |
| Income $95,000 or less | Guided Free File |
| Income over that | Free File Fillable Forms |
| Income not known | Find your income number first |

Each company sets its own rules, such as age or state. Always start at IRS.gov/freefile. A VITA volunteer can help for free: https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers or 800-906-9887.

## The answer file

```json
{ "format": "nt-form-filler", "version": 1,
  "answers": { "filing": "yes", "income": "yes", "fillable": "unsure", "open": "no" },
  "info": { "firstName": "", "lastName": "", "street": "", "city": "", "state": "", "zip": "", "birthDate": "", "phone": "" },
  "papers": ["w2", "ssn"] }
```

The website saves the same file. There is no Social Security number box. The script copies only these boxes and ignores the rest.

## The script

`python3 scripts/fill.py --file answers.json --text` prints one fact per line, then a final line that starts with "Note:". Problems come first, each starting with "Fix this first:". Without `--text` it prints JSON. With `--sheet` it prints the answer sheet.
