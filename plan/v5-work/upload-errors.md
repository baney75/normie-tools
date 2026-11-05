# Upload errors: never just "wrong file"

Plan only. Nothing here is built or published.

**Goal: NT needs to be the greatest tools for normies.** A person who gives NT the wrong file should leave knowing exactly what to do next.

**Applies to:** every tool that takes a file: Form Filler, Save Me Money, the bank importer, File Converter, File Converter and its Photo, Video, Audio, and Document Converter entry points, Receipt to Spreadsheet, Bank CSV to Tax Categories, Car Price Check, Loan Explainer, Loan Estimate Compare, Closing Day Guide, Student Loan Growth Check, Tenant Rights Guide and Repair Request Kit (lease and photo uploads), Resume Builder, Parent Care Organizer (bottle-label photos), backup restore, and any future import tool.

## The rule

Never show a bare "wrong file", "invalid format", or "error". Every mismatch message has four parts:

1. **What you gave:** the file type NT found by looking inside the file, not just at its name.
2. **What this tool needs.**
3. **What that is, in plain words.**
4. **How to get it**, with a link (the bank download guide in `student-debt-save-print-sync-import.md`, Part 4, where it fits).

**Better still:** if NT can safely use what you gave, offer that first as one button, and show the result for you to check before anything uses it.

> This is a PDF. This tool needs a CSV, which is a simple spreadsheet file your bank can give you.
> **[Read my PDF statement instead]**  NT will show you every line it found so you can check it.
> Or: [How to download a CSV from your bank]

Messages follow `no-clutter-rule.md`: one short message, at most two buttons, nothing lost (the person's other answers stay saved), no timers.

## Message template

```
This is {detected_type_plain}.            ← part 1
This tool needs {needed_type_plain}.      ← part 2
{needed_type_explainer}                   ← part 3 (one sentence)
[{safe_alternative_action}]               ← if NT can safely use it (optional)
[{how_to_get_it_link_text}]               ← part 4
```

Rules for the text: about a 6th-grade reading level, sentences under 15 words, no glossary-banned terms (see `rewrite-plan.md`), no blame ("you uploaded the wrong file" becomes "This is a PDF").

## Common cases

| What happened | What NT says | One-tap option |
|---|---|---|
| PDF bank statement where a CSV is needed | "This is a PDF bank statement. This tool works best with a CSV, a simple spreadsheet file from your bank." | "Read my PDF statement instead" (shows every line to check) |
| Photo of a document (JPG, HEIC) | "This is a photo. This tool needs the document as a PDF or a file from the website." | "Read the photo" (shows what it read to check) |
| Excel file (XLSX) where CSV is needed | "This is an Excel spreadsheet. NT can read it." | Reads it directly; no error shown |
| QFX or OFX file | "This is a money-app file (QFX). NT can read it." | Reads it directly |
| Word file where a PDF form is needed | "This is a Word document. Form Filler needs the form as a PDF." | "Turn it into a PDF" (File Converter) |
| Empty file | "This file is empty. It has nothing inside. Try downloading it again." | "Try again" |
| Damaged file | "This file looks damaged, so NT can't open it. Try downloading it again from where you got it." | "Try again" |
| Locked with a password | "This file is locked with a password. Open it with its password and save a copy without one. Or type the password here. NT won't keep it." | Password box (used once, never stored) |
| Too big for this phone | "This file is too big to work on this phone (2.1 GB). Try it on a computer or in the NT App." | "Send to my computer" if sync is on |
| Wrong document (W-2 where a 1099 is needed) | "This is a W-2, the form from an employer. This step needs a 1099, the form for other income like gig work. Look for mail or email marked 1099." | "Use this W-2 in the wages step instead" |
| Name doesn't match what's inside (`statement.csv` is really a PDF) | "This file is named .csv, but it's really a PDF inside." | Treat it as a PDF (offer the PDF option above) |
| Type NT doesn't know | "NT can't tell what kind of file this is. This tool needs {needed}." | How-to link only |
| Bank CSV in a layout NT hasn't seen | "This is a CSV, but NT doesn't know this bank's layout yet. Show NT which column is the date, the description, and the amount." | Column picker (remembered next time) |

## For builders
- Detect by content: magic bytes (`%PDF-`, `PK\x03\x04` plus `[Content_Types].xml` for OOXML, `\xD0\xCF\x11\xE0` for legacy Office, JPEG/PNG/HEIC signatures, `OFXHEADER` or `<OFX>`), then sniff text for CSV (delimiter and header detection). The file extension is a hint only.
- Document type within a type (W-2 vs 1099-NEC vs 1099-K vs bank statement): a small classifier on the text layer or OCR with fixed labels; below a confidence bar NT asks "Is this a W-2 or a 1099?" instead of guessing.
- Password detection: PDF `/Encrypt`, OOXML encrypted package (CFB with `EncryptionInfo`), ZIP encryption flag. Passwords live in memory for one use only.
- Size limits per surface come from the converter browser matrix (phone cap set in test-design.md).
- All messages come from one message table (`messages/upload.yaml`) keyed by (detected, needed). No tool writes its own error text. A missing pair falls back to the template with the generic explainer, never to a bare error.
- Every one-tap alternative is a preview first; nothing is used until the person checks it.
