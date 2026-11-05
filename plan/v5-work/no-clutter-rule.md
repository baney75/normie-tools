# The no-clutter rule (neurodivergent-friendly)

Plan only. Nothing here is built or published. Guidance was checked November 4, 2026 (ET); sources are in `PLATFORM-SOURCES.md` under "No-clutter rule".

**Goal: NT needs to be the greatest tools for normies.** That includes people with ADHD, autism, dyslexia, anxiety, memory or attention differences, and anyone tired, stressed, or interrupted. Nobody should ever feel overwhelmed using NT.

This rule applies to every NT screen: the website, the NT App, chat replies from NT skills, printed sheets, and messages. It applies to everything written this session: Form Filler with Free File, housing, jobs, and elder care, the merged File Converter, agents setup, File Converter, cars, loans, and mortgages, student loans, save and print, sync, bank import, and upload errors.

## Part 1: The base rule

- **One main thing per screen.** One question or one decision, one main button.
- **No clutter.** No ads, no banners, no "you might also like", no badges or counters that aren't needed. Extra options live behind one "More" button.
- **Plain words, short chunks.** Short sentences. A paragraph over about 50 words gets split. Lists for 3 or more things.
- **Same place, every time.** Help, Back, and Save sit in the same spot on every screen.

## Part 2: Neurodivergent-friendly

### 1. Small steps, one at a time
- Every task is broken into small steps, shown one at a time. A step asks for one thing.
- Before starting, NT says how many steps there are, about how long it takes, and what you'll need ("Have your W-2 nearby"). Nothing surprising halfway.
- Long content (a guide, a results list, a loan schedule) is split into short labeled sections you open one at a time. Never a long unbroken wall.
- Video or audio help is in short labeled parts (under 6 minutes each).

### 2. Nothing sudden
- **No surprise popups.** Nothing appears that you didn't ask for. Messages show inside the page, where you're looking.
- **No autoplay.** Video and sound never start on their own.
- **No layout jumps.** Buttons don't move while you're about to tap them. Space is held for things that load.
- **No timers that rush you.** No countdowns, no "session expired". If something truly has to expire (a 10-minute sync pairing code), NT says why, and getting a new one takes one tap with nothing lost.
- **Respect "reduce motion".** If your device is set to reduce motion, NT shows no animation at all. Even without that setting, motion is small, slow, and never needed to understand anything.
- **No flashing**, ever.

### 3. Always know where you are
- Every multi-step task shows **"Step 3 of 7"** in words, plus a progress bar.
- A **"Where you are"** summary is one tap away: steps done (with your answers), this step, and what's next. Tapping a done step lets you check or change it without losing anything.
- Every screen's title says what you're doing ("Your W-2: wages"), so if you look away and come back, you know.
- After any action, a clear sign it worked ("Saved", "Printed", "Added to calendar").

### 4. Pausing never loses work
- **Autosave every step**, on your device, the moment you answer. No Save button needed to keep your place.
- **Pick up where you left off.** When you come back, NT offers: "Pick up where you left off? You were on Step 4 of 7: Your bank file." Or "Start over" (which asks once to confirm, and keeps the old one for 30 days).
- Closing the tab, closing the app, losing signal, or the phone dying doesn't lose work.
- **Never ask twice.** Something you already typed in this task fills in for you, or you can pick it (WCAG 3.3.7, Redundant Entry). My Info fills common details.
- **Reminders only if you ask.** NT never nags. If you want, you can turn on one gentle reminder ("Remind me tomorrow to finish my taxes"). You pick when, how often, and how (calendar, phone alert, or email), and you can turn it off with one tap.

### 5. Easy ways in
- No puzzles, no "type the letters you see", no remembering codes to sign in or link devices. Linking devices has a QR code to scan, and the short code can be pasted (WCAG 3.3.8, Accessible Authentication).
- Password managers and paste always work.

### 6. Calm by default
- Calm colors, plenty of space, one font family, clear outlines around buttons.
- Errors are calm and specific, never red walls of text (see `upload-errors.md`).
- Sound off by default.

## Where this shows up in this session's work

| Section | How the rule applies |
|---|---|
| Form Filler with Free File (`form-filler-free-file.md`) | Each of the 6 parts is one step at a time, "Step 2 of 6" at the top; the papers list is a checklist you can tick off and come back to; answers autosave so a long tax session can be split over days; Free File's own sites may time out, so NT keeps your answers sheet safe on your device |
| Agents setup (`agents-skills-tools.md`) | The "Point your agent here" box is one sentence and one Copy button; agents report progress in short steps ("Step 2 of 4: downloading tools") and wait for you, never rush you |
| File Converter (`file-converter-quality.md`) | Pick file, pick format, check result: 3 steps with progress; no autoplay of converted video or audio; a poor result is one calm message, not a popup |
| Cars, loans, mortgages (`new-tools-cars-loans-mortgages.md`) | One loan term per screen in Loan Explainer; comparisons start with 3 numbers and a "Show more" for the rest; Closing Day Guide is "Step 1 of 5" with a printable checklist; wire-fraud warning is in the page, not a popup |
| Student loans (`student-debt-save-print-sync-import.md`) | One loan at a time; payoff schedule opens in sections by year |
| Save and print | Print gives one page by default; "Saved" confirmation every time |
| Sync | QR first, paste allowed, no countdown on screen; an expired code shows "Get a new code" with nothing lost |
| Bank import | The how-to is 6 numbered steps, one bank at a time, not a giant table on a phone |
| Housing, jobs, elder care (`new-tools-housing-jobs-eldercare.md`) | Repair Request Kit and Affordable Housing Finder are "Step n of N" with autosave; Interview Practice has no timer and saves each answer; Parent Care Organizer's fridge chart is one page; interaction notes sit calmly in the page, never as alarms |
| Upload errors (`upload-errors.md`) | One short message, at most two buttons, other answers kept |

## For builders

**Guidance this follows** (all W3C; details in `PLATFORM-SOURCES.md`)
- W3C COGA, *Making Content Usable for People with Cognitive and Learning Disabilities* (Working Group Note, 29 April 2021): objectives "Help users focus", "Ensure processes do not rely on memory", "Help users avoid mistakes"; patterns "Make Each Step Clear" (show completed, current, and pending steps), "Keep Text Succinct" (split paragraphs over 50 words), "Break Media into Chunks" (6 minutes or less); user needs to save work as you go, to not time out, and to control when and how often reminders are sent.
- WCAG 2.2 (W3C Recommendation, 5 October 2023): 3.3.7 Redundant Entry (A), 3.3.8 Accessible Authentication (Minimum) (AA), 3.2.6 Consistent Help (A), 2.5.8 Target Size (Minimum) (AA), plus 2.2.1 Timing Adjustable (A), 2.2.2 Pause, Stop, Hide (A), 2.2.6 Timeouts (AAA), 2.3.3 Animation from Interactions (AAA), 3.2.1 On Focus and 3.2.2 On Input (A), 2.4.8 Location (AAA). NT targets these AAA items too because they match this rule.
- `prefers-reduced-motion` media query for the reduce-motion setting.

**Implementation**
- One `<Stepper>` component for every multi-step flow: renders "Step n of N" text in the heading, a `<progress>` bar with an accessible name, and the "Where you are" drawer. A flow can't render without it (lint rule).
- One `useAutosave(flowId)` hook: writes each answer to IndexedDB within 500 ms of change, with a version number; restore on load offers "Pick up where you left off". The NT App uses the same store through its web view. Sync (if on) carries it to other devices.
- Reduced motion: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }` plus a JS check before any scripted motion.
- No `setTimeout` that changes the screen, submits, or ends a session without a person's action. Lint rule bans `<video autoplay>`, `<audio autoplay>`, `alert()`, and modal dialogs opened without a user action.
- Reserve space for async content (fixed aspect ratios, skeletons the same size as the content) so Cumulative Layout Shift stays at 0 on NT's own screens (web.dev "good" is 0.1 or less; NT's bar is stricter).
- Reminders: off by default; opt-in stores a single schedule the person chose; every reminder has a one-tap "Stop these".
- Tests: test-design.md, section 20.
