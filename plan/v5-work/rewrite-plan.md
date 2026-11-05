# NT plan v5: plain-language rewrite plan

Source: `nt-one-pagers-v5.pdf` (94 pages), audited from the real page text (`v5-work/pages.json`, extracted from `nt-one-pagers-v5.html`, which renders the PDF). Plan only: nothing in the PDF or the build files was changed.

**The reader:** someone with no tech background. They know phones, email, photos, PDFs, Wi-Fi, passwords, Trash, and Undo. They don't know what files are called inside a computer, how apps are built, or how AI tools are put together.

**Rules for the rewrite**

1. Keep every idea. Change only the words.
2. Person-facing parts (band text, Who it helps, Get ready, What you get, What happens, NT will never, chips, fact boxes, front pages) use no terms from the glossary below.
3. "For builders" panels and builder pages (12, 13, 16, the brand sheet) may keep technical terms, but they must be labeled "For builders" and kept visually separate.
4. App button and menu names (Export, vCard, Code execution, Connectors) stay word for word, because that's what the person sees on screen. Add a short plain explanation in brackets.
5. "To confirm" notes never sit inside a step a person follows.

**Counts:** 92 of 94 pages flagged; 441 phrases flagged (194 page-specific rewrites + 247 uses of 17 shared template phrases). Pages 12 and 16 are labeled builder pages and are not counted as leaks.

Donovan's example, "trace collection", does not appear word for word in the PDF. The closest is the cover's "every dollar traces back to your own rows" (page 1), which is fixed below.

## Top 10 worst cases

| # | Page | Current wording | Why it's bad | Plain swap |
|---|---|---|---|---|
| 1 | 1, 94 | "Use them yourself, or ask your agent." | The tagline on every page footer and the cover. "Agent" is the first word a normal reader trips on. | "Use them yourself, or ask your AI app." |
| 2 | 9 | "The person's browser (WebAssembly, WebCodecs)" plus the whole "Licenses, honestly" and "Browser limits" sections (ffmpeg.wasm, LGPL, --enable-gpl, COOP/COEP) | A person-facing page that is almost all builder detail. | Split the page: plain top half, a For builders bottom half. |
| 3 | 48, 49, 51 | Converter fact boxes: "wasm-vips (MIT wrapper; libvips and some parts LGPLv3) needs ... cross-origin isolation headers (COOP and COEP)" | Software library and license names inside the boxes on tool pages for the least technical tools. | "Works in up-to-date web browsers... NT checks first." |
| 4 | 13, 14 | "The NT App, the local MCP server, and the nt command share one engine"; "Grok Bot's docs say it supports the same MCP servers, plugins, and skills as Cursor" | MCP, engine, command line, plugin formats, on pages labeled Install. | Label page 13 For builders. On page 14, keep only plain steps for people and move commands under For builders. |
| 5 | 67, 83 | "a User-Agent with contact info is required... Access-Control-Allow-Origin is *"; "Free API with a data.gov key, 1,000 requests per hour per IP, plus full CSV and JSON downloads" | API and network terms in weather and calorie tool boxes. | "Your phone or computer asks the weather service directly"; "NT keeps a copy of the USDA food list built in". |
| 6 | 1 | "every dollar traces back to your own rows" | Closest to Donovan's "trace collection" example: data-tracing and spreadsheet words. | "Every dollar amount shows the exact bank charges it came from." |
| 7 | 6 | "A small on-device meaning model (all-MiniLM-L6-v2 through Transformers.js, about 22 MB)" and "a search_tools tool on the local MCP server" | AI model and server names on the page about finding tools. | "A small helper that understands meaning, not just exact words..." |
| 8 | All 76 tool pages | "Effort S" / "Wow 4/5" score box | Internal build estimates shown like a grade. | Move it into For builders. |
| 9 | 17, 19, 20, 24, 25, 33 + 14 pages with .ics | "Pick CSV and the dates you want"; "A calendar file (.ics)"; "XLSX"; "DOCX" | File-type initials. The brand sheet itself says: "Not 'Export a CSV.'" | "a spreadsheet file", "a calendar file (opens in your calendar app)", "a Word file". |
| 10 | 4 | "File tools keep an undo journal"; "use allowlists of official sites"; "A release is blocked if any tool misses its bar" | The Reliability promise, the page meant to build trust, is written in engineering terms. | "keep a record of every change so Undo can put things back"; "an approved list of official sites"; "we don't put out an update if any tool fails its tests". |

## Shared template fixes (apply once in the page templates)

These phrases come from shared page parts (chips, headers, standard steps), so one edit fixes every page that uses them. Each page entry below lists the template IDs it uses.

| ID | Current phrase | Assumes the reader knows | Plain replacement | Pages |
|---|---|---|---|---|
| T1 | Effort S / Effort M and Wow 4/5 (score box in the top right of every tool page) | That these are our own build-time and buzz estimates. A normal reader sees a grade they can't read. | Move the box into the For builders panel. Person side shows nothing in its place. | 76: 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93 |
| T2 | Ship first, #1 (chip) | "Ship" means release software. | One of the first 5 tools (or move to For builders). | 5: 17, 32, 37, 54, 66 |
| T3 | Your agent can run it too | What an "agent" is. | Your AI helper can use it too, with your OK | 11: 53, 54, 57, 58, 59, 60, 61, 62, 63, 64, 65 |
| T4 | Works in Claude, ChatGPT, and Grok | That these names are AI chat apps. Low severity: many people know ChatGPT. | Works in your AI app: Claude, ChatGPT, or Grok | 61: 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 52, 55, 56, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93 |
| T5 | Just chat | That "chat" means typing to an AI app. | Just type or talk to your AI app | 19: 25, 26, 31, 34, 44, 47, 52, 75, 78, 79, 82, 83, 84, 85, 86, 90, 91, 92, 93 |
| T6 | Uses your email or calendar connection | What a "connection" is and that it is set up once inside the AI app. | Needs your email or calendar linked to your AI app once (page 5 shows how) | 3: 69, 70, 71 |
| T7 | Runs on your device: NT website or NT App | What "on your device" means and why it matters. | Works right on your own phone or computer, on the NT website or in the NT App | 4: 48, 49, 50, 51 |
| T8 | Nothing is uploaded | What uploading is. Low severity. | Your file never leaves your phone or computer | 4: 48, 49, 50, 51 |
| T9 | Your AI can send you here | That the AI app can hand off to a web page. | Your AI app can point you to this tool | 4: 48, 49, 50, 51 |
| T10 | Checked November 4, 2026 (fact box label) | That this is a fact-check note, not an instruction. The box content is often technical (see page rows). | Label it "Where this comes from (checked Nov 4, 2026)" and keep only plain facts; move library, license, and API details into For builders. | 13: 30, 31, 32, 39, 48, 49, 51, 66, 67, 68, 83, 84, 91 |
| T11 | A calendar file (.ics) | That .ics is a calendar file type. | A calendar file (it opens in your calendar app) | 13: 21, 22, 24, 25, 26, 42, 72, 73, 74, 80, 82, 84, 87 |
| T12 | Pick CSV and the dates you want. Save the file. | What CSV is. (The brand sheet itself says: write "Download your bank file", not "Export a CSV".) | Pick the dates you want. If it asks for a file type, pick CSV (a simple spreadsheet file). Save the file. | 4: 17, 19, 20, 33 |
| T13 | Tap the ... tile. | That a "tile" is a button on the app's home screen. | Click the ... button. | 7: 54, 57, 58, 59, 60, 61, 63 |
| T14 | old installers | What an installer file is. | old app setup files you already used | 3: 53, 57, 58 |
| T15 | Wireframe, example content only. | Design word for a rough screen sketch. | Sketch of the screen, with made-up examples. | 7: 6, 7, 10, 11, 15, 37, 38 |
| T16 | ... : to confirm (in person-facing text) | That this is an internal open question. | Move to the For builders panel or a small "Still checking" note; never in a step a person follows. | 10: 5, 8, 9, 13, 14, 32, 36, 38, 48, 68 |
| T17 | read-only | That read-only means it can look but not change. | only reads, never changes | 3: 70, 71, 87 |

## Page-by-page audit

Format: the current phrase (quoted from the page; "/" joins lines that get one fix; "..." shortens a long quote), what it assumes the reader knows, and the plain replacement.

### Page 1: 

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Use them yourself, or ask your agent. | What an "agent" is. This is the tagline, so it sets the tone for everything. | Use them yourself, or ask your AI app. |
| Website first, plus the NT App and the nt command. | Product-strategy shorthand; what a "command" is. | Start on the NT website. For bigger jobs on your computer, get the free NT App. |
| 3. The nt command / One command so any agent can use every tool, with a preview and undo. | Command line, agents. A normal reader can't use this. | Drop this card from the cover; keep the three cards a person can use (website, app, your AI). Mention the nt command only on page 13 (For builders). |
| Free, and free to run. Work happens on your own device, so NT pays for no servers or AI (page 9). | "Free to run", "device", "servers". | Free, and it stays free. The work happens on your own phone or computer, so NT has no big bills to pass on to you. |
| Files and My Info stay on your device unless you share them. | "device". | Your files and My Info stay on your phone or computer unless you share them. |
| Tested before it ships, with a pass bar for every tool (page 4). | "ships", "pass bar". | Tested before you get it. Every tool must pass its own tests first (page 4). |
| Five on-device converters, a page on what runs where and what it costs, tool search everywhere, the nt command, a repeatable method for picking tools | "on-device", "converters", "tool search", "nt command". | New: five tools that change a file from one type to another right on your phone or computer, an easier way to find the right tool, and four new tools: ... |
| Save Me Money ... every dollar traces back to your own rows. | Spreadsheet "rows" and data "tracing". Closest match in the PDF to Donovan's "trace collection" example (that exact phrase does not appear). | Every dollar amount shows the exact bank charges it came from. |
| Ship these 5 first | "Ship" = release. | Start with these 5 |
| Effort S: about a day of build time. M: 2 to 4 days. Wow 1 to 5: how much it helps and how much a stranger reacts to the clip. | Build planning scores. | Move to a For builders footnote. |
| money, taxes, forms, converters, files, photos, safety | "converters" as a category word. | money, taxes, forms, changing file types, files, photos, safety |

### Page 2: Everything NT does (All tools 76 tools in 10 groups)

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| "Device" runs on your own phone or computer, on the website or in the NT App. "App" needs the NT App. "Live" uses free official data | Tag names "Device" and "Live" are tech shorthand. | Rename tags: "Device" to "Stays on your phone or computer" (short: "No upload"); "Live" to "Uses today's info". |
| 01 Save Me Money M/5 (the S/4, M/5 scores after every tool) | Build scores. | Remove scores from the person-facing index; keep them in a builders list. |
| 17 Bank CSV to Taxes | CSV in a tool name. | 17 Bank Download to Taxes |
| Cut in version 5 by the method on page 3 | "version 5", "the method". | Removed in this update (see how we choose, page 3) |

### Page 3: Help with the chores that cost the most (How we pick tools A method we repeat every quarter)

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Government data: FTC fraud reports, IRS burden estimates, CFPB complaint data, USA.gov services. | Agency initials and "burden estimates". | Government numbers: fraud reports to the Federal Trade Commission, the IRS's own estimate of how long taxes take, and complaints to the consumer protection bureau. |
| Help forums and search trends | "search trends". | What people ask most on help sites and in web searches |
| Reliability: tested code can do the exact part, and a tiny local model passes the tool's test set. If not, it waits. | "tested code", "tiny local model", "test set". | Reliable: a checked, step-by-step program does the exact work, and even a small AI gets it right in our tests. If not, the tool waits. |
| Rank by how often times how many people times the cost of the problem, then gain. ... the changelog says why. | A formula and "changelog". | Tools that help the most people with the costliest, most common chores go first. If a tool fails its tests or nobody uses it, we fix it or remove it and say why in our public list of changes. |
| Often / Gain / Safe (table headers with 1 to 5 scores) | Scoring shorthand. | How common / How much better than free options / How safe (1 to 5) |
| C+R Research survey: people guessed $86 a month on subscriptions; their itemized total was $219. | "itemized". Low severity. | ...when they added up each one, it was $219. |
| Hard to make reliable, and risky links. Fails the reliability gate. | "reliability gate". | Hard to make work every time, and its links can be risky. |
| Sources are listed in PLATFORM-SOURCES.md | A file name in Markdown. | Sources are listed at the end of this plan (builders file: PLATFORM-SOURCES.md). |

### Page 4: NT has to just work (Reliability promise Applies to every tool)

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Math, money totals, dates, file moves, and form filling are done by tested code, not by the AI. ... works the same in a big chat app and a small local model. | "tested code", "local model". | Math, money totals, dates, file moves, and form filling are done by checked step-by-step programs, never guessed by the AI. The AI only talks, asks, and explains. So NT works the same in a big AI app or a small AI on your own computer. |
| Every tool has a test set and a pass bar ... A release is blocked if any tool misses its bar. | "test set", "pass bar", "release". | Every tool has its own tests and a score it must hit. We don't put out an update if any tool misses. |
| on every supported app (Claude, ChatGPT, Grok, Grok Bot, the NT App, coding tools, and a small local model) ... save the recordings. | "coding tools", "local model". | ...in every AI app NT works with, the NT App, and a small AI on a computer, and we record each run. |
| File tools keep an undo journal and use the Trash. | "undo journal". | File tools keep a record of every change so Undo can put things back, and they use the Trash. |
| use allowlists of official sites | "allowlist". | use only an approved list of official sites |
| Versioned releases, public changelog / Every tool and skill has a version number. | "versioned releases", "changelog", "skill". | Numbered updates, with a public list of changes / Every tool has an update number. |
| The NT App works offline except for weather, news, forms, and updates | "offline". Low severity. | The NT App works without internet, except for weather, news, forms, and updates |
| Answer-key files in many bank layouts. | "answer-key files", "layouts". | Practice bank files from many banks, with the right answers known ahead of time. |
| Field detection, labels, and filled values scored against an answer key. Every form opened in three PDF readers. | "field detection", "PDF readers". | We check that NT finds every blank, reads its label, and fills the right answer. Every form is opened in three different PDF apps. |
| Test folders on Windows, macOS, Ubuntu, and Omarchy with planted files. ... undo restores every path exactly | "Ubuntu", "Omarchy", "planted files", "path". | Practice folders on Windows, Mac, and Linux computers. No file is ever lost, and Undo puts every file back exactly where it was. |
| Recorded responses from the weather service, feeds, and form sites, so tests repeat exactly. | "recorded responses", "feeds". | Saved copies of real weather reports, news lists, and form pages, so every test comes out the same. |

### Page 5: Add NT in one step (Install For everyone)
Template fixes: T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| turn on Code execution and file creation | What code execution is. (Keep the button name; explain it.) | turn on Code execution and file creation (this lets Claude make files for you) |
| Click Customize, Plugins, Add, Upload plugin, and pick the NT file | "plugin". | Keep the button names, add: "(a plugin is an add-on)". |
| No Plugins page? Use Customize, Skills, +, Upload a skill, one NT skill at a time. Which plans show Upload plugin: to confirm | "skill"; internal question in a step. | No Plugins page? Use Customize, Skills, +, Upload a skill, and add the NT files one at a time. (Move "to confirm" to builders.) |
| NT shows in search after OpenAI reviews it: to confirm | Internal note. | Move to builders. |
| File types and whether one file holds every skill: to confirm | Internal note. | Move to builders. |
| Linux AppImage, .deb, .rpm, or Flatpak from the NT website. | Linux package formats. | Linux: download from the NT website. It shows which download fits your computer. |
| Omarchy Press Super + Space, pick Install, then AUR, and type nt-app. Or use the AppImage. | Omarchy, AUR, AppImage. | Move under "Linux, advanced" or into page 12 (For builders). |
| The package name nt-app and the store listings are planned, not yet created. Each step is checked against platform docs on page 12 and page 8. | "package name", "platform docs". | Move to builders. |
| Agents and coding tools (Grok Bot, Claude Code, Codex, Cursor, pi, and more) are on page 14. | "agents", "coding tools", product names. | Use an AI helper that works on your computer, like Grok Bot? See page 14. |

### Page 6: Say it your way. Land on the right tool. (Finding the right tool Everywhere, on the device)
Template fixes: T15.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Everywhere, on the device | "on the device". | Works the same everywhere, right on your phone or computer |
| It works the same on the website, in the NT App, in your AI, and in the nt command. | "nt command". | ...on the website, in the NT App, and in your AI app. |
| The nt command: nt search "my downloads are a mess" --json. | Command line. | Move to For builders. |
| Agents: a search_tools tool on the local MCP server. | MCP, server. | Move to For builders. |
| Chat apps: a small "NT start" skill ... skill descriptions written and tested so the right one wakes up. | "skill", "wakes up". | In your AI app: ask "NT, what can you do?" and it lists every tool in plain words, and picks the right one when you describe a chore. |
| How it works, on the device | "on the device". | How it works (all on your phone or computer) |
| A small on-device meaning model (all-MiniLM-L6-v2 through Transformers.js, about 22 MB) ranks them by meaning. It downloads once and is cached. | Model names, MB, cached. | A small helper that understands meaning, not just exact words, sorts the matches. It downloads once, about the size of a few photos, and is kept for next time. |
| Built for tiny models / An agent never has to choose from 76 tools. nt search returns the top 5 ... | Whole section is for builders. | Move to For builders. |
| Pass bar: the right tool first 90% of the time, in the top 3 98% of the time, and "no tool fits" caught 90% of the time. | "pass bar", "top 3". | It must pick the right tool first 9 times out of 10, and say "no tool fits" when none does. |
| In each chat app, 200 requests check that the right NT skill starts. | "skill". | In each AI app, we check 200 requests to make sure the right NT tool starts. |
| Fast: results in under 100 ms on a 5-year-old phone once loaded. | "ms". | Fast: answers in a blink, even on a 5-year-old phone. |

### Page 7: One box: say what you need (NT website Domain to come)
Template fixes: T15.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| The prompt box | "prompt". | The question box |
| The box matches the words to the right tool or skill and opens it. Matching runs in the browser using a small on-page index of every tool's plain-words examples, so typed words are not sent anywhere. | "skill", "browser", "on-page index". | The box finds the right tool and opens it. The matching happens on your own phone or computer, so what you type is never sent anywhere. |
| ... run in the browser, and the file never leaves the device. | "browser", "device". | ...work right in the web page, and the file never leaves your phone or computer. |
| Add to buttons: Claude, ChatGPT, Grok, Grok Bot, and coding tools (copy one line). | "coding tools", "copy one line". | Add to buttons for Claude, ChatGPT, Grok, and Grok Bot. (Coding tools line moves to builders.) |
| "NT will never" and the tool's test pass bar. | "pass bar". | "NT will never", and the tests the tool must pass. |
| Version, changelog, and known limits. | "changelog". | What changed lately, and what it can't do yet. |

### Page 8: On phones, no app store (NT website Phones, buttons, and building it)
Template fixes: T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| It opens like an app, and we skip app store review. | "app store review" is a builder concern. | It opens like an app, with no app store needed. |
| There is no install button or install prompt on iOS | "iOS", "install prompt". | iPhones don't show an install button |
| On iOS and iPadOS 26, every site added to the Home Screen opens as a web app by default (an "Open as Web App" switch is on). | iOS versions, "web app". | On newer iPhones and iPads, it opens full screen, like an app. |
| On iOS 16.4 to 18, the site needs a web app manifest with display: standalone to open as a web app. NT ships one anyway. | manifest, display: standalone. | Move to the For builders block. |
| Since iOS 16.4, Home Screen web apps can get push notifications ... only after the person taps a button to allow them. | "push notifications", iOS version. | NT can send alerts to your phone (weather, bill reminders), but only after you tap Allow. |
| Chrome offers Install when the site has a manifest with a name, 192 px and 512 px icons, a start URL, and a display mode, over HTTPS. | manifest, px, URL, HTTPS. | In Chrome, tap Install. (Requirements move to builders.) |
| On phones with Google Play services, Chrome installs it as a WebAPK ... Other browsers make a shortcut instead. | WebAPK, Google Play services. | It gets its own icon, like any other app. |
| Browser storage can be cleared, so My Info on the web offers an encrypted backup file. | "browser storage", "encrypted". | Your browser can erase what websites save, so NT lets you save a locked backup copy of My Info. |
| Apple's configuration-profile web clips: skipped. ... | configuration profiles, web clips. | Move to the For builders block. |
| A true one-click link: to confirm / Opens NT's listing in Plugins once OpenAI approves it: to confirm / Opens the NT plugin listing: to confirm | Internal open questions. | Move to builders. |
| Coding tools: A copy button with the one line for each tool from page 14. | Coding tools. | Move to builders. |

### Page 9: Free to use, and free to run (What runs where And what it costs us)
Template fixes: T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Free server-side converting would cost a lot, and it would mean holding people's files. So every web tool runs on the person's own device. | "server-side", "device". | If we changed files on our own computers, it would cost a lot and we'd be holding your files. So every website tool does its work on your own phone or computer. |
| The person's browser (WebAssembly, WebCodecs) or the NT App | WebAssembly, WebCodecs. | Your web browser or the NT App |
| Hosting the code files. Each one downloads once, only when used, then is cached. | "hosting", "cached". | Only the cost of keeping the tool online. It downloads once, the first time you use it, and is kept for next time. |
| Nothing beyond static hosting. | "static hosting". | Nothing beyond keeping the website online. |
| The device asks api.weather.gov directly (the API allows this from any site) | API. | Your phone or computer asks the National Weather Service directly. |
| The person's AI app search, or the NT App reading feeds / Most news feeds block reading from other websites, and we will not run a relay server. | feeds, relay server. | Your AI app's search, or the NT App reading the news sites you pick. / Most news sites don't allow websites to read them, and we won't run our own computer in the middle. |
| A bundled USDA FoodData Central download / No API key in the browser. | bundled, API key. | A copy of the USDA food list built into NT. / Nothing. |
| A list of official forms rebuilt by a scheduled job; final check on the device / GitHub Actions is free for public repos: to confirm. | scheduled job, GitHub Actions. | We refresh the list of official forms automatically; your device double-checks each form. (GitHub note to builders.) |
| The person's own AI app or local model. | "local model". | Your own AI app, or a small AI on your own computer. |
| No hosted AI. ... Static hosting only. If a tool would need a server, it moves to the NT App or the person's AI. | hosted, static hosting, server. | NT never runs its own AI or its own computers for you. If a tool would need that, it lives in the NT App or your AI app instead. |
| Browser limits we design around (ffmpeg.wasm, WebCodecs, wasm-vips, cross-origin isolation headers, pandoc.wasm) | Every term. | Move the whole section to a For builders half. Person version: "Very big videos on a phone: NT sends you to the NT App on a computer." |
| Licenses, honestly (LGPL 2.1, GPL, x264, @ffmpeg/core, --enable-gpl, MPL-2.0, LGPLv3, MIT, module) | Software licensing. | Move to For builders. Person version: "NT uses free, open tools made by others, and follows their rules." |
| What NT does pay for: static hosting ... code signing for Windows, and Apple's developer program for Mac notarization | code signing, notarization. | Move to For builders. |

### Page 10: Big buttons for everyday chores (NT App Windows, Mac, Linux)
Template fixes: T15.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Chat apps can't touch the files on your computer. | "chat apps". | AI apps like ChatGPT can't reach the files on your computer. |
| Big tool tiles with plain names. | "tiles". | Big tool buttons with plain names. |

### Page 11: Pick, check, one button, undo (NT App One screen per task)
Template fixes: T15.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Plain words. No jargon like "hash" or "directory". Grade 6 reading level. | "Grade 6 reading level" is a writing-standard term. | Plain words a 6th grader can read. No tech words. |
| Keyboard: every action has a visible focus ring; Enter presses the big button, Ctrl or Cmd + Z undoes. | "focus ring". | Keyboard: a clear outline shows where you are; Enter presses the big button, and Ctrl or Cmd + Z undoes. |
| Screen readers: real buttons and labels, tested with NVDA, VoiceOver, and Orca. | Screen reader product names. | Works with screen readers (apps that read the screen out loud), like VoiceOver on Mac and iPhone. |
| Text contrast at least 4.5:1, touch targets at least 44 px. | Contrast ratios, px. | Text is easy to see, and buttons are big enough to tap. (Numbers move to builders.) |

### Page 12: Stack, packages, updates (NT App For builders)
Builder page, already labeled "For builders". Technical terms are allowed here. No person-facing leak.

### Page 13: One command for every tool (The nt command For agents and power users)
Template fixes: T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Eyebrow: The nt command, For agents and power users | Page is fully technical but not labeled For builders. | Eyebrow: For builders: the nt command |
| The NT App, the local MCP server, and the nt command share one engine. Any agent that can run a command can use every NT tool | MCP, engine, agent, command. | Add one plain line at the top: "For people who use AI helpers on their computer: one way for any helper to use every NT tool, with the same preview and undo." Keep the rest as builders text. |

### Page 14: NT inside your agents (Install Agents and coding tools)
Template fixes: T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Eyebrow: Install, Agents and coding tools | "agents", "coding tools". | Install: AI helpers on your computer |
| The same skills work in agent apps and coding tools. With the NT App installed, agents can also run the file tools on your computer, with your OK each time. | skills, agents, coding tools. | If you use an AI helper that can work on your computer, it can use NT's file tools too. It asks your OK each time. |
| Target: the NT Grok Bot plugin. Grok Bot's docs say it supports the same MCP servers, plugins, and skills as Cursor ... Plan: ship NT in the Cursor plugin format | MCP, plugin format, Cursor. | In Grok Bot: open Connect apps in the sidebar and add NT. (Format notes move to builders.) |
| Grok Bot works from a cloud computer. To touch files on your own computer, you turn on Execution on this computer ... NT's file tools then run through the NT App's nt command ... Whether Grok Bot can attach a local MCP server: to confirm | cloud computer, nt command, MCP. | Grok Bot works online. To let it work with files on your computer, turn on "Execution on this computer" in its settings. It asks before each step. |
| The NT App ships a one-click desktop extension (.mcpb) for its local MCP server. | .mcpb, MCP server. | The NT App comes with a one-click add-on for the Claude app on your computer. |
| Grok's custom connectors need a public URL, so local file tools stay in the NT App. ChatGPT desktop with a local server: to confirm | connectors, public URL, local server. | Those websites can't reach your computer's files, so file tools stay in the NT App. |
| Coding tools and agent harnesses (Claude Code, Codex, Cursor, pi, Hermes, OpenCode, Goose, Any MCP client, /plugin marketplace add OWNER/normie-tools, ~/.agents/skills/, stdio) | Command lines and folders. | Move this whole block under a "For builders" label. |
| Preview. The agent calls nt tidy downloads --preview. Nothing moves. | Command syntax, "agent". | Preview. Your AI helper asks NT for a preview. Nothing moves. |
| Apply. The engine moves files and writes the undo journal. | engine, undo journal. | Do it. NT moves the files and keeps a record so Undo can put them back. |
| Tiny local models only pick the command and read short JSON back; ... myinfo_request | JSON, function name. | Your AI helper only sees the My Info details you approve, and you see the list first. (Rest to builders.) |

### Page 15: Your details, ready when you need them (My Info Type it once)
Template fixes: T15.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| In the NT App the key lives in the system keychain (Keychain on Mac, Credential Manager on Windows, Secret Service on Linux). | key, keychain. | In the NT App, it's locked with your computer's own built-in password safe. |
| On the website, it is encrypted in the browser with a passcode you choose, and you can save an encrypted backup file. | "encrypted". | On the website, it's locked with a passcode you choose, and you can save a locked backup copy. |
| Never uploaded or synced unless you share it yourself. | "synced". | Never sent online or copied to your other devices unless you share it yourself. |
| Stored only on your device, encrypted. | "device", "encrypted". | Kept only on your phone or computer, locked. |

### Page 16: One source, every app (For builders Packaging)
Builder page, already labeled "For builders". Technical terms are allowed here. No person-facing leak.

### Page 17: Save Me Money (NT 01 Budget and saving)
Template fixes: T1, T2, T4, T12.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A ranked savings list (PDF and XLSX). Every dollar figure links back to the rows it came from. | XLSX, spreadsheet "rows". | A savings list, biggest first, as a PDF and an Excel spreadsheet. Every dollar amount shows the exact bank charges it came from. |
| NT makes a cancel list, call scripts, and reminders for each one. | "call scripts". | NT makes a cancel list, what to say on each call, and reminders. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 18: Receipt to Spreadsheet (NT 02 Budget and saving)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A spreadsheet (XLSX or CSV) with one row per receipt. | XLSX, CSV, "row". | A spreadsheet (opens in Excel, Numbers, or Google Sheets) with one line per receipt. |
| NT reads each receipt and fills in a row. | "row". | NT reads each receipt and fills in a line. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 19: Subscription Finder (NT 03 Budget and saving)
Template fixes: T1, T4, T12.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 20: Monthly Budget (NT 04 Budget and saving)
Template fixes: T1, T4, T12.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 21: Bill Due Reminders (NT 05 Budget and saving)
Template fixes: T1, T4, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 22: Warranty and Returns Keeper (NT 06 Budget and saving)
Template fixes: T1, T4, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 23: Medical Bill Explainer (NT 07 Budget and saving)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 24: Spending Check-in (NT 08 Budget and saving)
Template fixes: T1, T4, T11.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Pick the last 7 days and save the CSV file. | CSV. | Pick the last 7 days and save the file (pick CSV if it asks). |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 25: Savings Goal Tracker (NT 09 Budget and saving)
Template fixes: T1, T4, T5, T11.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Each month, attach your savings account CSV to update progress. | CSV. | Each month, attach this month's download from your savings account. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 26: Debt Payoff Planner (NT 10 Budget and saving)
Template fixes: T1, T4, T5, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 27: Bill Negotiation Prep (NT 11 Budget and saving)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Get a short, polite call script and your facts on one page | "call script". | Get what to say on the call, short and polite, and your facts on one page |
| A one-page call sheet PDF and a notes template. | "template". | A one-page call sheet PDF and a blank page for notes. |
| It writes a short script with what to say | "script". | It writes down what to say |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 28: Cheaper Plan Finder (NT 12 Budget and saving)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| "you used 4 GB a month, your plan has unlimited" | GB. Low severity: plans use GB. | "you used 4 GB (gigabytes) of data a month; your plan is unlimited" |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 29: Price Drop Watch (NT 13 Budget and saving)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A watch list (CSV) with each check's date and price. | CSV. | A watch list spreadsheet with each check's date and price. |
| Chip: Uses free official data | Not jargon, but wrong: store prices are not official data. | Chip: Checks store prices when you ask |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 30: Credit Report Check (NT 14 Budget and saving)
Template fixes: T1, T4, T10.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 31: Benefits Finder (NT 15 Budget and saving)
Template fixes: T1, T4, T5, T10.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 32: Tax Filing Helper (NT 16 Taxes)
Template fixes: T1, T2, T4, T10, T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Have last year's AGI or your 5-digit signature PIN handy. | AGI. | Have last year's adjusted gross income (AGI, a number on last year's return) or your 5-digit signing PIN ready. |
| From January 2027, open IRS Free File through IRS.gov. | That Free File is a program name. Low severity. | From January 2027, open IRS Free File (the IRS's free filing program) at IRS.gov. |
| With an agent that can use a browser, it types the answers into the free site while you watch. | "agent", "browser". | If your AI helper can use websites for you, it types the answers into the free site while you watch. |
| It points you to free help (VITA) when your return is not simple. | VITA. | It points you to free in-person tax help (the IRS's VITA program) when your return is not simple. |
| Fact box: guided software at AGI of $95,000 or less (partners set their own rules), and Fillable Forms for any income, federal only. Free help VITA and TCE sites ... whether each route's terms allow a browser agent to fill screens. | AGI, partners, Fillable Forms, VITA, TCE, browser agent. | Free File: free guided filing if you made about $95,000 or less last season (each company sets its own rules), or free fill-in IRS forms at any income, federal only. Free in-person help: VITA and TCE sites, found at IRS.gov. (Move "browser agent terms" to builders.) |
| Get your return ready in a free, official filing site, then review it and press Submit yourself. | That "filing site" means IRS Free File, and that people know it exists. | Do your taxes for free with IRS Free File. NT gets your answers ready, step by step. You check them, sign, and press Submit. (See form-filler-free-file.md, "What this is".) |
| People who can file a simple return and want free, step-by-step help getting it done. | "simple return" is tax shorthand. | People with everyday taxes (a job, some gig work, kids, Social Security, school costs) who want free help. If your taxes aren't simple, NT sends you to free help from a person (VITA). (See form-filler-free-file.md, Step 1.) |
| NT checks which free route fits you and tells you why, in plain words. | "route" and the two Free File options. | NT asks a few questions and tells you which free way fits: guided Free File or Free File Fillable Forms. (See form-filler-free-file.md, Step 3.) |
| A fill sheet PDF that matches the free site screen by screen, a checklist of what you entered, and a saved copy of your confirmation. | "fill sheet". | An answer sheet that tells you what to type on each Free File screen, a papers checklist, and a saved copy of your confirmation email. (See form-filler-free-file.md, Steps 2, 4, and 6.) |
| You review every page, sign in and sign yourself, and press Submit. NT then saves your confirmation. | That "sign" means typing last year's AGI or a 5-digit PIN. | You check the review page, then sign by typing last year's income number (AGI) or your 5-digit PIN, and press Submit. NT then saves your confirmation. (See form-filler-free-file.md, "Who does what".) |
| (missing on the page) credits and refund tracking | Not jargon: the page never mentions EITC, the Child Tax Credit, the Saver's Credit, or Where's My Refund. | Add one line: "NT checks for credits people often miss, and shows you how to track your refund." (See form-filler-free-file.md, Steps 5 and 6.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 33: Bank CSV to Tax Categories (NT 17 Taxes)
Template fixes: T1, T4, T12.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Title: Bank CSV to Tax Categories | CSV in the tool name. | Bank Download to Tax Groups |
| A spreadsheet (XLSX or CSV) with every charge sorted | XLSX, CSV. | A spreadsheet with every charge sorted |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 34: Year-End Tax Checklist (NT 18 Taxes)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 35: Tax Folder Organizer (NT 19 Taxes)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| plus a spreadsheet index of every paper | "index". | plus a spreadsheet list of every paper |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 36: Mileage Log (NT 20 Taxes)
Template fixes: T1, T4, T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Export your calendar for the year (in Google Calendar: Settings, then Import and export). | "export". | Save a copy of your calendar for the year (in Google Calendar on a computer: Settings, then Import and export, then Export). |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 37: Form Filler (NT 21 Forms and paper: flagship, 1 of 2)
Template fixes: T1, T2, T4, T15.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Eyebrow: Forms and paper: flagship, 1 of 2 | "flagship". | Forms and paper: our main tool, part 1 of 2 |
| Upload any PDF form. / Upload any PDF. A fillable form, a scan, or a phone photo of paper. | "upload", "fillable". | Add any PDF form: one you can type into, a scan, or a phone photo of paper. |
| Same answers, saved on your device, so you can start on one and finish on the other with an export file. | "device", "export file". | Your answers are saved on that phone or computer. To finish on the other one, save an answers file and open it there. |
| NT Launch post draft ... normie-tools/skills/form-filler (sits under the phone sketch, outside any For builders label) | Skill folder path and marketing draft in the person area. | Move both into a For builders label, as on every other tool page. |
| Anyone facing a long form: school, benefits, a lease, a doctor's office, the DMV. | Not jargon, but taxes are missing from the list. | Anyone facing a long form: school, benefits, a lease, a doctor's office, the DMV, or your yearly taxes with IRS Free File. (See form-filler-free-file.md.) |

### Page 38: Desktop, signing, and how we build it (NT 21 Form Filler: flagship, 2 of 2)
Template fixes: T15, T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Eyebrow: Form Filler: flagship, 2 of 2 | "flagship". | Form Filler, part 2 of 2 |
| type your name in a script font | "script font". | type your name in a handwriting-style font |
| Form Finder gets the official, current blank. My Info fills the basics. Phone Photo to Scan cleans up paper forms first. | That Free File isn't a PDF. | Add: "For taxes, Form Filler works with the IRS Free File screens instead of a PDF. It makes an answer sheet for each screen, and Form Finder only opens IRS.gov/freefile." (See form-filler-free-file.md, Step 4.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 39: Form Finder (NT 22 Forms and paper)
Template fixes: T1, T4, T10.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A link to the official form, its name, number, and revision date. | "revision date". Low severity. | A link to the official form, its name, number, and the date it was last updated. |
| Fact box: Allowlist CISA publishes the full list of .gov domains as a public CSV (cisagov/dotgov-data). ... irs.gov/pub/irs-pdf/f1040.pdf is titled "2025 Form 1040". | allowlist, CISA, domains, CSV, a GitHub repo name, a file path. | Official sites only: NT checks every site against the government's own public list of .gov websites, plus a hand-checked list of official sites that don't end in .gov. It reads each form's date from the form itself, every time. (Source names and paths move to builders.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 40: PDF Combine and Shrink (NT 23 Forms and paper)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 41: Phone Photo to Scan (NT 24 Forms and paper)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 42: Plain Letter Explainer (NT 25 Forms and paper)
Template fixes: T1, T4, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 43: Lease Red Flags (NT 26 Forms and paper)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 44: Letter Kit (NT 27 Forms and paper)
Template fixes: T1, T4, T5.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A letter as DOCX and PDF | DOCX. | A letter as a Word file and a PDF |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 45: Big Print (NT 28 Forms and paper)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 46: Insurance Card Wallet (NT 29 Forms and paper)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Never reads out full member numbers in chat. | "in chat". | Never shows your full member numbers in the conversation. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 47: Family Emergency Binder (NT 30 Forms and paper)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 48: Image Converter (NT 31 Converters)
Template fixes: T1, T7, T8, T9, T10, T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Turn iPhone photos (HEIC) into JPGs | HEIC, JPG. | Turn iPhone photos into JPGs (the photo type every website takes) |
| New image files (JPG, PNG, WebP, and more) | PNG, WebP. | New picture files in the type you need, like JPG or PNG |
| NT reads each picture on your device | "device". | NT reads each picture on your phone or computer |
| Fact box: wasm-vips (MIT wrapper; libvips and some parts LGPLv3) needs the site to send cross-origin isolation headers (COOP and COEP). Basic JPG, PNG, and WebP work with the browser's own decoders. HEIC decoding in each browser: to confirm. | Library, license, and header names. | Works in up-to-date web browsers. Some browsers can't open iPhone photos yet; when that happens, NT says so and offers the NT App. (Library and license details move to builders.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 49: Video Converter (NT 32 Converters)
Template fixes: T1, T7, T8, T9, T10.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A new MP4 (or WebM) video | MP4, WebM. | A new video that plays on almost any phone or computer |
| NT checks the video on your device | "device". | NT checks the video on your phone or computer |
| Fact box: Mediabunny (MPL-2.0) uses the browser's WebCodecs. Full WebCodecs: Safari 26+, ... ffmpeg.wasm core is GPL-2.0-or-later and caps input at 2 GB ... LGPL FFmpeg | Library, license, browser-feature names. | Works in up-to-date Safari, Chrome, Edge, and Firefox on a computer. Some older iPhones and Firefox on Android can't do it; NT checks first. On a phone, videos bigger than about 300 MB go to the NT App on a computer instead. (Library and license details move to builders.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 50: Audio Converter (NT 33 Converters)
Template fixes: T1, T7, T8, T9.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A new audio file (MP3, M4A, WAV, and more). | M4A, WAV. | A new sound file, usually an MP3, which plays almost anywhere. |
| NT reads the file on your device | "device". | NT reads the file on your phone or computer |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 51: Document Converter (NT 34 Converters)
Template fixes: T1, T7, T8, T9, T10.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Change documents between Word, PDF, plain text, web pages, and ebooks (EPUB), on your own device. | EPUB, device. | Change documents between Word, PDF, plain text, web pages, and ebooks, on your own phone or computer. |
| A new document: DOCX, PDF, EPUB, HTML, Markdown, or plain text. | DOCX, EPUB, HTML, Markdown. | A new document: a Word file, PDF, ebook, web page, or plain text. |
| NT reads the file on your device | "device". | NT reads the file on your phone or computer |
| Fact box: pandoc 3.9 (Feb 2026) added an official WebAssembly build. ... Typst in WebAssembly. Download is about 16 MB compressed. Pandoc is GPL-2.0-or-later, so it ships as a separate module with its source offered. | Library, WebAssembly, license. | The first time, the converter downloads once (about 16 MB, like a few photos). After that your files never leave your device. (Library and license details move to builders.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 52: Unit Converter (NT 35 Converters)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 53: Storage Checker (NT 36 Files, photos, and storage)
Template fixes: T1, T3, T14.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Tap Storage Checker. It looks at your drive. | "drive". | Click Storage Checker. It looks at what's stored on your computer. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 54: Photo Duplicate Finder (NT 37 Files, photos, and storage)
Template fixes: T1, T2, T3, T13.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Grouped results on screen, a CSV of what moved, and freed space. | CSV. | Grouped photos on screen, a list of what moved, and freed space. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 55: ID Photo Maker (NT 38 Files, photos, and storage)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 56: Share-Safe Photos (NT 39 Files, photos, and storage)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Shrink photos for upload limits | "upload limits". | Shrink photos to fit a website's size limit |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 57: Large File Finder (NT 40 Files, photos, and storage)
Template fixes: T1, T3, T13, T14.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A list on screen, a CSV export, and freed space. | CSV, export. | A list on screen, a spreadsheet copy to keep, and freed space. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 58: Downloads Tidy (NT 41 Files, photos, and storage)
Template fixes: T1, T3, T13, T14.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| NT shows how it will sort things: Documents, Pictures, Installers, Other. | "Installers" as a folder name. | ...Documents, Pictures, App setup files, Other. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 59: Desktop Cleanup (NT 42 Files, photos, and storage)
Template fixes: T1, T3, T13.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| NT shows a plan: keep shortcuts, sort files into a dated folder by type. | "shortcuts". | NT shows a plan: keep the icons that open your apps, and sort files into a dated folder by type. |
| You can pin files that should stay put. | "pin". | You can mark files that should stay put. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 60: Screenshot Cleanup (NT 43 Files, photos, and storage)
Template fixes: T1, T3, T13.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| On a phone: export screenshots to your computer first. NT shows how. | "export". | On a phone: copy your screenshots to your computer first. NT shows how. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 61: Folder Organizer (NT 44 Files, photos, and storage)
Template fixes: T1, T3, T13.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 62: File Mover (NT 45 Files, photos, and storage)
Template fixes: T1, T3.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Move lots of files to a new place, like an external drive | "external drive". | Move lots of files to a new place, like a USB drive you plug in |
| Anyone moving photos to a backup drive | "backup drive". | Anyone moving photos to a spare drive for safekeeping |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 63: Bulk Rename (NT 46 Files, photos, and storage)
Template fixes: T1, T3, T13.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 64: Old Phone Backup Import (NT 47 Files, photos, and storage)
Template fixes: T1, T3.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Title: Old Phone Backup Import / A tidy, dated photo library and an import report. | "backup", "import report". | Title: Old Phone Photo Import / A tidy photo collection by date, and a list of what came in. |
| Anyone with an old phone in a drawer or a pile of backup folders. | "backup folders". | ...or a pile of folders of saved copies. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 65: Find a Lost File (NT 48 Files, photos, and storage)
Template fixes: T1, T3.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 66: Morning Briefing (NT 49 Daily briefings)
Template fixes: T1, T2, T4, T10.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Fact box: Calendar and email through the person's own read-only connection. | "read-only connection". | Your calendar and email are only read, never changed, through the link you set up in your AI app. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 67: Weather Briefing (NT 50 Daily briefings)
Template fixes: T1, T4, T10.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Fact box: National Weather Service API at api.weather.gov. ... a User-Agent with contact info is required. Limits Rate limits exist but are not public. ... (checked: Access-Control-Allow-Origin is *), so the website runs it on the device. | API, User-Agent, rate limits, CORS header. | Source: the National Weather Service. Free, US only, no radar maps. Your phone or computer asks the weather service directly, so your town isn't sent to NT. (Technical details move to builders.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 68: News Briefing (NT 51 Daily briefings)
Template fixes: T1, T4, T10, T16.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| People who want to stay informed without doomscrolling. | Slang. Low severity. | People who want to stay informed without scrolling through upsetting news for hours. |
| Fact box: In the NT App RSS feeds the person picks. | RSS, feeds. | In the NT App: headlines from news sites you pick. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 69: Email Organizer (NT 52 Email, calendar, and contacts)
Template fixes: T1, T4, T6.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A plain plan, and for Gmail a filters file (.xml) you can import in Settings, Filters. | .xml, filters, import. | A plain plan, and for Gmail a file of sorting rules you load in Gmail (Settings, then Filters). |
| Otherwise it gives you a filter file to import in Gmail settings. | filter file, import. | Otherwise it gives you a sorting-rules file to load in Gmail settings. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 70: Newsletter Cleanup (NT 53 Email, calendar, and contacts)
Template fixes: T1, T4, T6, T17.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 71: Bills and Receipts from Email (NT 54 Email, calendar, and contacts)
Template fixes: T1, T4, T6, T17.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| It also works with Bank CSV to Tax Categories. | Tool name with CSV. | It also works with Bank Download to Tax Groups. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 72: Calendar Cleanup (NT 55 Email, calendar, and contacts)
Template fixes: T1, T4, T11.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Google Calendar: on a computer, open Settings, then Import and export, then Export. / iPhone or Outlook: export or share the calendar as a file. | "export". Keep menu names; explain. | Save a copy of your calendar as a file. (Google Calendar on a computer: Settings, then Import and export, then Export. iPhone or Outlook: share the calendar as a file.) |
| You download a clean calendar file and import it into a new calendar, then hide the old one. | "import". | You download a clean calendar file, add it to a new calendar, then hide the old one. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 73: Family Calendar Merge (NT 56 Email, calendar, and contacts)
Template fixes: T1, T4, T11.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| You download one calendar file to import or share with your family. | "import". | You download one calendar file to add to your calendar or share with your family. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 74: Syllabus to Calendar (NT 57 Email, calendar, and contacts)
Template fixes: T1, T4, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 75: Appointment Prep (NT 58 Email, calendar, and contacts)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 76: Contacts Cleanup (NT 59 Email, calendar, and contacts)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Google Contacts: on a computer, choose Export, then vCard. / iPhone: ... Export vCard. | vCard. Keep the menu word; explain it. | ...choose Export, then vCard (a contacts file). |
| A clean contacts file (.vcf) and a list of merges. | .vcf. | A clean contacts file and a list of what was combined. |
| You download a clean file and import it. Your old file is your backup. | import, backup. | You download the clean file and add it back to your contacts. Your old file stays as a spare copy. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 77: Holiday Card Address List (NT 60 Email, calendar, and contacts)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 78: Recipe to Grocery List (NT 61 Home and health)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 79: Weekly Meal Planner (NT 62 Home and health)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 80: Medicine Schedule (NT 63 Home and health)
Template fixes: T1, T4, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 81: Home Inventory (NT 64 Home and health)
Template fixes: T1, T4.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 82: Moving Checklist (NT 65 Home and health)
Template fixes: T1, T4, T5, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 83: Calorie Counter (NT 66 Home and health)
Template fixes: T1, T4, T5, T10.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A daily log (CSV) and a weekly one-page summary. | CSV. | A daily food list (a spreadsheet) and a weekly one-page summary. |
| NT matches each food to the USDA FoodData Central database and asks about portion size if unsure. | "database", program name. Low severity. | NT looks up each food in the USDA's free food list and asks how much you had if unsure. |
| Fact box: Public domain (CC0 1.0). Free API with a data.gov key, 1,000 requests per hour per IP, plus full CSV and JSON downloads for offline use. | CC0, API, key, IP, CSV, JSON, offline. | Source: the USDA's free food list (FoodData Central). NT keeps a copy built in, so lookups work without internet and what you eat is never sent anywhere. (Technical details move to builders.) |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 84: Workout Plan (NT 67 Home and health)
Template fixes: T1, T4, T5, T10, T11.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 85: New Phone Setup Guide (NT 68 Home and health)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 86: Simple Invoice Maker (NT 69 Work and school)
Template fixes: T1, T4, T5.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 87: Job Application Tracker (NT 70 Work and school)
Template fixes: T1, T4, T11, T17.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 88: Resume Formatter (NT 71 Work and school)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A resume as DOCX and PDF. / You download a DOCX and a PDF. | DOCX. | A resume as a Word file and a PDF. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 89: Voice Memo to Notes (NT 72 Work and school)
Template fixes: T1, T4.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| On iPhone, open the memo and copy its transcript if your phone shows one. | "transcript". | On iPhone, open the memo and copy the typed-out words (the transcript) if your phone shows them. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 90: Scam Check (NT 73 Safety)
Template fixes: T1, T4, T5.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Long-press the message, copy it, and paste it into your AI app. | "Long-press". | Press and hold the message, tap Copy, and paste it into your AI app. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 91: Scam Recovery Plan (NT 74 Safety)
Template fixes: T1, T4, T5, T10.

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 92: Password Checkup Guide (NT 75 Safety)
Template fixes: T1, T4, T5.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| A short fix-first list you keep. | "fix-first". Low severity. | A short list of what to fix first. |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 93: Account Recovery Kit (NT 76 Safety)
Template fixes: T1, T4, T5.

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| Get ready before you get locked out: backup codes, recovery email | "backup codes", "recovery email". | Get ready before you get locked out: backup codes (one-time codes a site gives you in case you lose your phone) and a second email for getting back in |

For builders panel: labeled and separate. It may keep technical terms. Launch post draft is fine.

### Page 94: How NT looks and sounds (NT brand sheet Version 1, November 4, 2026)

| Current phrase | Assumes | Plain replacement |
|---|---|---|
| LINE: Small tools for everyday things. Use them yourself, or ask your agent. | "agent" in the official tagline. | Use them yourself, or ask your AI app. |
| Voice rule: Plain, not technical. "Download your bank file." Not "Export a CSV." | Not jargon, but tool pages break this rule (T12). | Keep the rule; fix the tool pages. |
| Whole page (ligature, px, mm, RGB, contrast 8.6:1, ISC license, SIL Open Font License, REPO normie-tools/skills/<slug>) | Designer and builder terms. | Label the eyebrow "For builders and designers: brand sheet". |

## Free File path: pages 32, 37, and 38

The rewrite rows for page 32 (Tax Filing Helper) and pages 37 to 38 (Form Filler) that end with "(See form-filler-free-file.md ...)" point to the new plain-language walk-through in [form-filler-free-file.md](form-filler-free-file.md). That file is the source wording for these pages. Use its words when the pages are rewritten. Facts in it were checked on IRS.gov on November 4, 2026. The 2027 income limit and the partner list are posted in January, to confirm.

## Glossary: banned or replaced terms in person-facing text

| Term | Plain swap |
|---|---|
| agent | your AI helper; your AI app |
| AI app / chat app | your AI app (Claude, ChatGPT, or Grok) |
| API | say where the information comes from: "the National Weather Service" |
| app store review | drop it |
| AUR, AppImage, .deb, .rpm, Flatpak, DMG | "the Linux download" or "the Mac download"; details to builders |
| allowlist | an approved list of official sites |
| backup | a spare copy |
| backup codes | one-time codes a site gives you in case you lose your phone |
| browser | web browser (Safari, Chrome, or Edge), or just "the web page" |
| cached | kept for next time |
| changelog | public list of what changed |
| CLI, command line, terminal, the nt command | builders only. Person version: "AI helpers on your computer can use NT too" |
| code execution | keep the button name; explain "lets Claude make files for you" |
| coding tools, harness | builders only |
| connector, connection | link your email or calendar to your AI app (one-time setup) |
| CSV | a spreadsheet file (say "pick CSV if it asks" only where a bank site shows that word) |
| DOCX | a Word file |
| XLSX | an Excel spreadsheet |
| .ics | a calendar file that opens in your calendar app |
| .vcf / vCard | a contacts file (keep "vCard" only as a button name) |
| .xml | a settings file |
| EPUB | an ebook |
| HEIC | iPhone photo |
| WebP, PNG, M4A, WAV, WebM, HTML, Markdown | "other common types", or name the use: "web page", "plays anywhere" |
| device, on device, on-device | your phone or computer; stays on your phone or computer |
| drive, external drive | the space on your computer; a USB drive you plug in |
| encrypted | locked with a passcode |
| keychain | your computer's built-in password safe |
| engine | NT (builders: nt-core) |
| eval, test set, pass bar | tests, and the score each tool must hit |
| Effort / Wow | builders only |
| export / import | save a copy out / add it back in (keep the words only as menu names) |
| feeds, RSS | news sites you pick |
| flagship | our main tool |
| hosting, static hosting, server, relay server | keeping the website online; our own computers |
| installer | an app setup file |
| JSON | builders only |
| LGPL, GPL, MPL, MIT, ISC, CC0, license | builders only. Person version: "free, open tools made by others" |
| local model, tiny model | a small AI on your own computer |
| manifest, service worker, WebAPK, HTTPS, px | builders only |
| MB, GB | keep for file-size limits people see; add "(about the size of a few photos)" where helpful |
| MCP, MCP server, .mcpb | builders only. Person version: "a one-click add-on for the Claude app" |
| plan ID, run ID | builders only. Person version: "NT always shows you a preview first" |
| plugin, skill | add-on; NT tool |
| preview | keep (plain), or "a look first" |
| push notifications | alerts on your phone |
| PWA, web app, Home Screen web app | "add the NT website to your Home Screen; it opens like an app" |
| read-only | only looks, never changes |
| release, ship, version | update; put out |
| rows | lines; the bank charges |
| router, tool search | finding the right tool |
| script (call script, script font) | what to say; a handwriting-style font |
| shortcuts, pin | icons that open your apps; mark to stay put |
| sync, synced | copied to your other devices |
| tile | button |
| trace, traces back | shows where it came from |
| transcript | the typed-out words |
| undo journal | a record of every change so Undo can put it back |
| upload | send to a website (keep "upload" only where a site's button says it) |
| WebAssembly, wasm, WebCodecs, ffmpeg, pandoc, libvips, Mediabunny, Typst | builders only. Person version: "works right in your web browser" |
| wireframe | sketch of the screen |
| Grade 6 reading level | words a 6th grader can read |
| focus ring, contrast ratio, touch target | a clear outline shows where you are; easy to see; big enough to tap |
| AGI, VITA, TCE, Free File, revision date | keep the official names (people need them on IRS.gov), but add a plain explanation the first time each one appears |

64 terms.
