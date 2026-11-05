# Student debt, save and print, sync, and bank import

Plan only. Nothing here is built or published, and the PDF is unchanged. Facts were checked November 4, 2026 (ET); sources are in `PLATFORM-SOURCES.md` under "Student loans, sync, and bank downloads".

**Goal: NT needs to be the greatest tools for normies.** This file adds two student loan tools and three shared features every tool uses: save and print, keeping your data across devices, and getting your bank file in.

All parts follow `no-clutter-rule.md` (one step at a time, progress shown, saves as you go) and `upload-errors.md` (clear messages when a file is wrong).

---

## Part 1: Student loan tools (2 new tools)

### 1. Student Loan Growth Check
**What it does:** Shows, from your own loan numbers, how your student loan grows over time and why: daily interest, and interest that gets added to your balance ("capitalized").

**Who it's for:** Anyone with federal or private student loans who wants to understand their balance.

**What you do**
1. Enter each loan: balance, interest rate, and type (federal or private). Or upload a statement or the loan list you download from StudentAid.gov.
2. NT shows how much interest each loan adds per day and per month.
3. NT explains capitalization in plain words: "Unpaid interest can be added to what you owe. Then you pay interest on that interest."
4. NT shows the moments when that can happen for federal loans (from StudentAid.gov), for example when a grace period or deferment on an unsubsidized loan ends, or when you consolidate.

**What you get:** A one-page sheet: today's balance, daily interest, what the balance becomes if nothing is paid for a set time, and which events could add interest to the balance.

**Example (made up):** $10,000 at 6.53% simple interest adds about $1.79 a day. After 365 days with no payments, $653.00 of interest has built up. If it's capitalized, the new balance is $10,653.00, and interest is then charged on that.

**NT never:** Guesses your rate or balance. Promises a payment amount or forgiveness.

**For builders:** Federal Direct Loans use simple daily interest: balance x rate / 365 per day (verify the day-count rule against StudentAid.gov and the servicer's statement in the test fixtures). Capitalization events come from a reviewed list, each with its StudentAid.gov link and a "last checked" date. Private loans: NT uses only the terms on the person's statement; if compounding isn't stated, it says "ask your lender how interest is added" and shows no projection.

### 2. Student Loan Payoff Plan
**What it does:** Compares ways to pay off your loans faster and shows the dollars and months each way saves. Also explains federal repayment options using only what StudentAid.gov says today.

**Who it's for:** Anyone paying student loans.

**What you do**
1. Uses the loans from Growth Check (or you enter them).
2. Pick an extra amount you can pay each month, even $0.
3. NT compares, side by side:
   - **Avalanche:** extra money goes to the highest interest rate first. Usually the least interest paid.
   - **Snowball:** extra money goes to the smallest balance first. Quick wins.
   - **Minimums only.**
4. For each: payoff date, total interest, and total paid, exact to the cent.
5. **Federal options (read-only facts, linked):** NT shows the current list from StudentAid.gov with a "last checked" date. As of November 4, 2026: the Repayment Assistance Plan (RAP) became available July 1, 2026, for eligible Direct Loans, with payments of 1% to 10% of income, $50 a month less per dependent, a $10 minimum, and up to 30 years; the SAVE plan ended in March 2026 and borrowers on it must choose another plan. Public Service Loan Forgiveness (PSLF) needs 120 qualifying payments while working full-time for a qualifying employer. Anything marked as changing says "Check StudentAid.gov" and links there.

**What you get:** A one-page plan with the payoff order, dates, and totals, and a list of official links.

**NT never:** Promises forgiveness or says you qualify. Changes your plan or contacts your servicer. Calls a plan "best".

**For builders:** Reuses Debt Payoff Planner's engine (tool 10) with student-loan inputs; one engine, two pages. Federal plan facts live in `facts/studentaid.json`, each with a source URL, the quoted text, and a checked date; a weekly job flags any page change for human review, and facts older than 30 days show "may be out of date". RAP payment estimates are not computed until the formula is confirmed on StudentAid.gov's own pages and its Loan Simulator; until then NT links to the Loan Simulator.

---

## Part 2: Save and print (shared by every tracker and plan)

**For people:** Every budget, food log, debt plan, workout plan, checklist, and comparison has two buttons: **Save** and **Print**. Print makes one clean page. Save keeps it on this device (and on your other devices if you turn on Keep in sync).

**What a printed sheet looks like**
- One page, Letter or A4 (NT picks from your printer settings; you can switch).
- Title, your name if you want it, and the date at the top.
- The main numbers big, the details below in a simple table.
- Readable in black and white: no meaning carried by color alone, lines and labels instead.
- A footer: "Made with NT on <date>. Numbers from <source>." No ads, no web addresses beyond NT's.
- If something doesn't fit on one page, NT says so and offers "Print summary (1 page)" or "Print everything (N pages)".

**Save options:** Save in NT (default), Save as PDF, Save as spreadsheet (CSV) where it's a table.

**For builders**
- One print stylesheet and one "sheet" component for all tools: `@page { size: letter | A4; margin: 12mm }`, system fonts, grayscale-safe palette, tables with borders, no backgrounds required.
- Each tool provides a `summary()` that fits one page and a `full()` view. The renderer measures and falls back to the summary.
- PDF export in the browser via the print path; the NT App uses its web view's PDF print.

---

## Part 3: Keep in sync across devices

**For people**
- Your data lives on your device. To use it on your phone and computer, turn on **Keep in sync**.
- On the first device, NT shows a **QR code** and a **short code** (6 digits). On the second device, scan the QR code, or type the code. That's it. The devices are linked.
- The short code works once and only for 10 minutes. After that it's useless.
- Your logs are locked (encrypted) on your device before they leave it. NT's server only passes along locked data it can't read. Not your budget, not your food log.
- **Backup file:** any time, tap "Save a backup file". Keep it somewhere safe. You can restore from it on any device.
- **If your browser data gets cleared:** data only on that device is gone from it. If sync was on, link the device again and everything comes back from your other device. If not, restore from your backup file. NT reminds you about backups only if you ask it to.
- **iPhone note:** Safari can delete data from websites you haven't opened in 7 days. Adding NT to your Home Screen helps; sync or a backup file keeps you safe.

**Why it works this way (honest version)**
- Browser storage and cookies stay on one device. Moving data between devices needs a small go-between server (a relay).
- A 4 to 8 digit code can be guessed if it lasts long, so it's never the key to your data. It's only a one-time, short-lived pairing code with a limited number of tries.
- The real key is long and random. It's passed directly between your devices during pairing (inside the QR code, or through the secure handshake the short code starts). The server never sees it.

**For builders**
- **Pairing:** a PAKE (SPAKE2, as used by Magic Wormhole) over the relay. The 6-digit code is the PAKE password; a wrong guess fails the handshake and burns the code. An active attacker gets one guess per code (1 in 1,000,000 for 6 digits). The QR path carries a 256-bit random key directly and skips the PAKE.
- **Limits:** code lifetime 10 minutes; one use; per-code lockout after 1 failed handshake; per-IP and per-account rate limits (for example 10 pairing attempts per hour). Numbers set in test-design and logged.
- **Data:** each device holds a sync key; records encrypted with XChaCha20-Poly1305 (or AES-GCM via WebCrypto) before upload; the relay stores ciphertext blobs with a random ID, size, and timestamp only. Conflict rule: per-record last-writer-wins with a version counter, plus an append-only log for food and money entries so nothing is silently lost.
- **Relay:** Cloudflare Workers plus a Durable Object per sync group. Free tier: 100,000 Worker requests a day (checked 2026-11-04). Sizing: batch writes (one request per minute of activity at most); at 20 requests per active user a day, the free tier covers about 5,000 daily active syncing users. Beyond that, the paid tier is a cost NT has to plan for; sync stays optional and the app works fully without it.
- **Storage on device:** IndexedDB, with `navigator.storage.persist()` requested after the person turns on sync or saves a backup. Safari caps script-written storage at 7 days of no use unless the site is a Home Screen web app.
- **Backup file:** a single `.ntbackup` file (JSON, encrypted with a passphrase the person picks, or unencrypted if they choose and are warned).
- **Recovery:** losing every device and the backup loses the data. NT says this plainly at setup. No server-side recovery exists, by design.

---

## Part 4: Getting your bank file in (bank import help)

NT is free, so it doesn't use paid bank-connection services. You download a file from your bank and give it to NT.

### The three kinds of bank file, in plain words
- **CSV (best):** a simple spreadsheet file. One line per charge or deposit. Almost every bank offers it, usually called "Spreadsheet", "CSV", "Excel", or "Comma delimited".
- **QFX or OFX:** a money-app file (Quicken uses QFX). NT can read these too.
- **PDF statement:** the monthly statement you'd print. NT can read many of these, but it's slower and less sure. NT shows you every line it read so you can check it.

### How to do it (any bank)
1. Sign in to your bank's **website on a computer**. Many bank phone apps can't download a CSV.
2. Open the account (checking, savings, or credit card).
3. Look for **Download**, **Export**, or a down-arrow icon near your list of transactions.
4. Choose **CSV** (or "Spreadsheet" or "Excel").
5. Pick the dates. For taxes or a budget, pick the full year or 12 months.
6. Download, then drag the file into NT.

If you can't find a download button, download your **PDF statements** instead (usually under "Statements" or "Documents") and give those to NT.

### Bank by bank
Status: **Verified** = steps checked on the bank's own help page on 2026-11-04. **To confirm** = steps from guides, not yet checked on the bank's own page; NT shows the general steps above as well.

| Bank or app | Steps | Notes | Status |
|---|---|---|---|
| Chase | Website, open account, "Download account activity", choose Spreadsheet (CSV) or Quicken (QFX), pick dates | Desktop site; about 2 years back | To confirm |
| Bank of America | Website, account Activity, Download, choose "Microsoft Excel Format (.csv)", pick dates | No longer offers QFX/Web Connect per guides | To confirm |
| Wells Fargo | Website, "Download Account Activity", pick dates, choose "Comma Delimited (ASCII, Spreadsheet)", Download | 90 days by default, up to 18 months for some accounts | Verified |
| Citi | Website, account details, set dates, Download icon, CSV | Each account separately | To confirm |
| Capital One | Website (not the app), account, "Download Transactions", CSV, pick dates | Some accounts may only show PDFs | To confirm |
| U.S. Bank | Website, account, Transactions, download icon, pick dates, Spreadsheet (.CSV) | Not in the mobile app | Verified |
| PNC | Website, account, Transaction Activity, Export, CSV | Older activity: PDF statements | To confirm |
| Credit unions | Most have Download or Export on the website; names vary | Use the general steps | General |
| American Express | Website, Statements & Activity, pick dates, "Download Your Transactions", CSV | | Verified |
| Discover | Website, card, Activity, Export, CSV | | Verified (Discover FAQ page; steps to re-check) |
| PayPal | Activity, All reports, Activity download, pick type and dates, CSV, Create report, Download | Up to 12 months per report | Verified |
| Venmo | venmo.com, Statements, pick month, Download CSV (app: Settings, Statements) | One month at a time | Verified |
| Cash App | Statements: app Profile, Documents, Account Statements (PDF). CSV: cash.app/account, Activity, CSV | | Verified |

**For builders**
- Importer parses CSV (with per-bank header profiles and a generic fallback that asks the person to point at the date, description, and amount columns once, then remembers), OFX 1.x SGML and 2.x XML, QFX, and PDF statements (text layer first, OCR fallback, every line shown for review).
- Sign handling (credit cards often show charges as positive), date formats, thousands separators, footer total lines, pending rows, and duplicate imports (hash of date, amount, description, and account).
- Bank profiles are versioned. Each profile has a made-up fixture in the real column layout and a "verified on" date. A layout change found in the wild becomes a new fixture.
- Fixtures are made up. No real statements, ever.

## Count
- New tools in this file: 2 (Student Loan Growth Check, Student Loan Payoff Plan). Save and print, sync, and import are shared features, not tools.
- The final count across all queued changes (89) and its breakdown are in `README.md`.
