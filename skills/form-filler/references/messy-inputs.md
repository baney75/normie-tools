# Messy inputs

- Blank box: fine. The sheet says "Not filled in".
- Extra spaces: tidied. " Ana " becomes "Ana".
- Name with a number, like "R2D2": refused. The line says "use letters only. No numbers."
- State: two letters, any case. "tx" becomes "TX". A full name like "Texas" is refused.
- ZIP: 5 numbers, or 5, a dash and 4. Anything else is refused.
- Birth date: 2000-02-29 or 2/29/2000. Fake days (2023-02-30) and 1900-02-29 are refused.
- Phone: 10 numbers. A leading 1 is dropped. "(555) 010-1234" becomes "555-010-1234".
- A Social Security number in the file: ignored, never printed.
- Wrong file (a PDF, a spreadsheet, a photo): "This is not an answer file from Form Filler." Ask for the saved answers file or start over.
- Text that looks like code: kept as plain text or refused. It is never run.
