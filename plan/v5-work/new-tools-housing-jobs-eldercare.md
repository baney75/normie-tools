# New tools: housing, jobs, and elder care

Plan only. Nothing here is built or published, and the PDF is unchanged. Facts were checked November 5, 2026 (ET); sources are in `PLATFORM-SOURCES.md` under "Housing, jobs, and elder care".

**Goal: NT needs to be the greatest tools for normies.** These tools help with three hard parts of life: finding and keeping a decent place to live, getting a job and fair pay, and helping a parent with medicines and doctor visits.

**Rules for every tool here**
- Official sources only, each shown with a link and a "last checked" date.
- NT is not a lawyer, a doctor, a pharmacist, or a recruiter. It explains, organizes, and drafts. It never gives legal or medical advice, and it points to free help (legal aid, 211, the pharmacist).
- NT never sends, submits, applies, or calls for you. You read every letter and you send it.
- NT never makes up a fact about you: no invented jobs, skills, rents, wages, or medicines.
- Screens follow `no-clutter-rule.md`: one step at a time, "Step 2 of 5" with a bar, a "Where you are" summary, autosave and "Pick up where you left off", no popups or timers, reduced motion respected, reminders only if you turn them on.
- File problems use `upload-errors.md` (for example, a photo where a lease PDF was expected gets a clear message and a "Read the photo" option).
- Every list or plan prints on one clean page (see Save and print in `student-debt-save-print-sync-import.md`).

Six new tools: Housing (3), Jobs (2), Elder care (1). Two existing tools also get upgrades (Resume Formatter becomes Resume Builder; Medicine Schedule gets the same interaction-warning rule as Parent Care Organizer). Upgrades aren't new tools.

---

## HOUSING

### 1. Affordable Housing Finder
**What it does:** Walks you through the official ways to find lower-cost housing near you, and keeps track of every list you've applied to.

**Who it's for:** Anyone who's paying too much for rent or needs a place.

**What you do (Step 1 of 4 and on)**
1. Tell NT the city or ZIP code. (Nothing else is needed to start.)
2. NT shows three official ways, one at a time:
   - **Affordable apartments:** HUD's Resource Locator shows HUD-assisted and tax-credit properties near you. You contact each property to ask about openings.
   - **Public housing and vouchers (Section 8):** you apply through your local public housing agency (PHA), not HUD. NT finds your PHA in HUD's directory. Waiting lists are common and can be long, and they sometimes close. You can apply to more than one PHA.
   - **211:** call or text 211, or visit 211.org, to talk to a local person about rent help, shelters, and utility help.
3. NT gives you a papers checklist from HUD: pay stubs, bank information, other benefit letters (SSI, SNAP), proof of citizenship or eligible status, and Social Security cards.
4. A tracker for each waiting list: where you applied, the date, your confirmation number, and a reminder (if you want one) to update your address or check your place.

**What you get:** A one-page list of places and agencies to contact, a papers checklist, and the waiting-list tracker.

**NT never:** Says you qualify. Applies for you. Shows listings from non-official sites. Promises a wait time.

**For builders:** Links out to resources.hud.gov (Resource Locator) and HUD's PHA contact list (updated weekly by HUD); no scraping of listings. HUD income limits are linked, not computed, unless the person asks "Am I under the limit?" and then NT shows the official table row for their county and household size from HUD's published data, with the year. Tracker data is local (sync optional).

### 2. Tenant Rights Guide
**What it does:** Explains, in plain words, what renters' rights look like in your state, using only official sources, and points you to free legal help.

**Who it's for:** Renters with a question: deposits, repairs, entry, rent increases, eviction notices, discrimination.

**What you do**
1. Pick your state, then your question from a short list (or say it your way).
2. NT shows the official source for your state and what it says, quoted with the link and date. Federal protections apply everywhere: the Fair Housing Act bans discrimination because of race, color, national origin, religion, sex, familial status, or disability.
3. If you live in HUD-assisted housing, NT shows HUD's resident rights (for example, safe and sanitary housing and timely repairs on request).
4. Every answer ends with: "This isn't legal advice. For help with your situation, contact free legal aid." NT finds your local legal aid through the Legal Services Corporation's lookup and LawHelp.org.
5. **Eviction notice?** NT shows that first, in a calm box: don't ignore it, note any dates on it, and contact legal aid now.

**What you get:** A one-page summary for your state and question, with links, and your legal aid office's contact info.

**NT never:** Tells you what you're allowed to do in your case. Says a landlord broke the law. Fills or files court papers. Uses non-official summaries as a source.

**For builders:** `facts/tenant/<state>.json`: each entry is a quote, the official URL (state statute, state attorney general, or state court self-help site), and the checked date. A state with no verified entry shows "We haven't checked your state yet" plus legal aid and 211, never a guess. HUD's state pages index (hud.gov/states) is the starting list. Weekly link check; changed pages go to human review. Fair Housing complaint route: HUD FHEO.

### 3. Repair Request Kit
**What it does:** When your landlord won't fix something, NT helps you write a dated repair request, keep a photo log, understand what code enforcement does, and see the next steps. You send everything yourself.

**Who it's for:** Renters with a repair that isn't getting done: heat, water, leaks, mold, pests, broken locks.

**What you do (Step 1 of 5 and on)**
1. **What's wrong.** Pick the problem and when it started. NT asks one question at a time.
2. **Photo log.** Take photos. NT puts each one in a dated log with a short note ("Kitchen ceiling leak, getting bigger"). Photos stay on your device.
3. **Repair request letter.** NT drafts a short, polite, dated letter: what's wrong, when it started, when you first told the landlord, and a request to fix it by a date you choose. You read it, change it, print or copy it, and send it yourself. NT suggests keeping a copy and a record of how you sent it.
4. **Code enforcement.** NT explains in plain words: your city or county has a housing or building code office. If you report a problem, an inspector may come look and can order the owner to fix code violations. NT finds the office's official page or phone number for your city, or suggests calling 211 to ask.
5. **Next steps.** A short, ordered list: a follow-up letter, the code office, your PHA if you have a voucher, HUD's line if you live in HUD-assisted housing, and free legal aid. Each step says "This isn't legal advice."

**What you get:** A dated letter (PDF and text), a photo log you can print, and a one-page "what I've done so far" record with dates.

**NT never:** Sends the letter, emails the landlord, or calls anyone. Tells you to withhold rent or repair-and-deduct (rules differ and mistakes can lead to eviction; it says "ask legal aid first"). Adds threats or legal claims to the letter.

**For builders:** Letter built from Letter Kit (tool 27) templates; fixed plain text plus the person's own facts; no legal claims inserted by the model (phrase check). Photo log stores EXIF date when present, and the person's typed date otherwise, both labeled. Code office lookup: the city or county .gov site; when none is verified, NT shows 211. HUD Multifamily Clearinghouse number is shown only for HUD-assisted residents.

---

## JOBS

### Resume Builder (upgrade of Resume Formatter, tool 71, not a new tool)
**What changes:** Resume Formatter now also builds a resume from scratch, using only the person's real history. NT asks about each job, school, and skill, one at a time, and writes plain bullet points from the person's own words.
- **Real history only.** Every line on the resume must trace to something the person said or a file they gave. NT never adds a job, a title, a date, a degree, or a skill. If a bullet sounds stronger than what you said, NT shows both and you pick.
- Gaps are fine. NT doesn't hide or invent anything to cover them; it offers honest wording if you want it ("Caregiver for a family member, 2023 to 2024").
- Output: plain one-page resume (PDF and DOCX) that job sites can read.

### 4. Interview Practice
**What it does:** Practice answering common interview questions, out loud or typed, at your own pace, and get gentle, specific feedback.

**Who it's for:** Anyone with an interview coming up, especially if it makes them nervous.

**What you do**
1. Tell NT the job (or paste the job posting).
2. NT asks one question at a time: common ones ("Tell me about yourself"), ones from the posting, and the questions you should ask them.
3. Answer by talking or typing. No timer. Pause any time; your answers save.
4. NT gives one or two kind, concrete notes per answer (for example: "Add one example from your job at the store"). It uses only your real history from Resume Builder.
5. A checklist for the day: what to bring, how to get there, and a short thank-you note to send afterward (you send it).

**What you get:** A one-page practice sheet with your best answers and the day-of checklist.

**NT never:** Invents stories or experience for your answers. Records or keeps audio unless you choose to. Contacts the employer.

**For builders:** Questions from a fixed bank plus the posting. Voice uses on-device speech-to-text where available (Voice Memo to Notes engine); audio is discarded after transcription unless the person saves it. Feedback rubric: specificity, example, length; model output must quote the person's answer and reference only their facts (checked). DOL and CareerOneStop interview tips are the source for the day-of checklist.

### 5. Pay Negotiation Prep
**What it does:** Shows what people in your job and area are typically paid, from U.S. government wage data, and helps you plan what to say when you get an offer.

**Who it's for:** Anyone with a job offer, or asking for a raise.

**What you do**
1. Pick your job title from a list (NT matches it to the government's job categories and asks you to confirm) and your city or state.
2. NT shows the official wage range from the Bureau of Labor Statistics (BLS): the middle (median) pay, and the low and high ends (10th, 25th, 75th, and 90th percentiles), with the year of the data. Plain words: "Half of people in this job here make less than $X, and half make more."
3. Enter the offer. NT shows where it falls in that range.
4. NT helps you plan: your target and lowest acceptable pay, other things to ask about (start date, schedule, paid time off, an early pay review), and a short, polite script. Tips come from the U.S. Department of Labor's CareerOneStop: wait for an offer, base your ask on the job's market pay and your skills, take time to think, and get the final offer in writing.

**What you get:** A one-page sheet: the official range, where your offer sits, your plan, and your script.

**NT never:** Says what you're "worth". Promises a result. Uses wage numbers from non-government sites. Sends anything to the employer.

**For builders:** BLS OEWS May 2025 data (area and state files, XLSX from bls.gov/oes/tables.htm) bundled as a compact table keyed by SOC code and area; hourly and annual percentiles exactly as published (no interpolation). Suppressed values (shown by BLS as `*` or `#`) are shown as "not published" with the reason, never filled in. Title-to-SOC matching uses the on-device router with confirmation. Yearly refresh when BLS releases new data, with the data year on every sheet. BLS's own guide "Using OEWS data during salary negotiations" is the method.

---

## ELDER CARE

### 6. Parent Care Organizer
**What it does:** Keeps a parent's (or anyone you care for) medicines and doctor visits in one calm place: a medicine list, a daily schedule, refill reminders, questions for the doctor, and an appointment tracker.

**Who it's for:** Adult children and other caregivers. Works for more than one person (Mom, Dad).

**What you do**
1. **Medicine list.** Add each medicine: name, strength, what it's for, how much and when, who prescribed it, and the pharmacy. Include over-the-counter medicines, vitamins, and supplements (the FDA's advice for a complete list). Snap a photo of the bottle label and NT reads it; you check every field.
2. **Daily schedule.** NT turns the list into a simple "morning, noon, evening, bedtime" chart you can print and put on the fridge.
3. **Refills.** Enter the fill date and days' supply. NT shows when each runs out and, if you want, reminds you a few days before.
4. **Questions for the doctor.** Add questions any time. Before a visit, NT puts them on one page with the current medicine list.
5. **Appointment tracker.** Visits, who it's with, what to bring, and notes afterward. Optional calendar events.
6. **Interaction notes.** If a medicine's official FDA label mentions another medicine on the list, NT shows it in a calm box: "The official label for Medicine A mentions Medicine B. Ask the pharmacist about taking these together." It quotes the label and links to it. Always "Ask the pharmacist."

**What you get:** A printable medicine list (like FDA's "My Medicine Record"), the daily chart, a refill list, and a visit sheet.

**NT never:** Gives medical advice. Says a combination is safe or unsafe. Says "no interactions found" (it says "NT didn't find a mention on the labels. That doesn't mean there's no interaction. Ask the pharmacist."). Changes a dose. Orders refills or calls the pharmacy.

**For builders**
- **Interaction source:** the free NLM RxNav drug interaction API was discontinued on January 2, 2024, so NT does not use it. NT uses FDA drug labels (DailyMed, and openFDA's `drug_interactions` field, label section 7) and RxNorm (still running) to normalize names to ingredients. A note is shown only when label text names the other ingredient or its class, and the note quotes the label. No pairwise database with an unclear license is used (DrugBank's free license is academic only; DDInter is non-commercial; both ruled out).
- Label photo reading: OCR then fields checked by the person; nothing is saved until confirmed.
- Reuses Medicine Schedule (tool 63) for the schedule and Appointment Prep (tool 58) for visit sheets; this tool adds multiple people, refills, and the caregiver view. Medicine Schedule gets the same interaction-note rule.
- Health data stays on the device; sync is optional and end-to-end encrypted.

---

## Count
Six new tools: Affordable Housing Finder, Tenant Rights Guide, Repair Request Kit, Interview Practice, Pay Negotiation Prep, Parent Care Organizer. Two upgrades (not counted as new): Resume Builder (was Resume Formatter) and Medicine Schedule. The final count is in `README.md`.

## Open items
- Tenant rights: each state's official sources still need to be collected and checked; until then that state shows legal aid and 211 only.
- Code enforcement offices are local; a verified list per city doesn't exist yet. NT falls back to 211.
- BLS OEWS May 2025 file layout and suppression symbols to confirm against the downloaded files.
- Drug label matching quality (ingredient and class mentions) needs a pharmacist review of the test cases before launch.
