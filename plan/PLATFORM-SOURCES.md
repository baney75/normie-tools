# NT v3 platform verification (checked Nov 4, 2026, ET)

## Chat apps (primary, for normal people)
- Claude.ai skills: Customize > Skills > + > Create skill > Upload a skill (ZIP whose top folder holds SKILL.md). Needs Settings > Capabilities > Code execution and file creation. All plans incl. Free.
  https://support.claude.com/en/articles/12512180-use-skills-in-claude ; https://claude.com/docs/skills/how-to
- Claude.ai plugins: Customize > Plugins > Add > Add marketplace (GitHub owner/repo) or Upload plugin (.zip/.plugin with one .claude-plugin/plugin.json). Saved to account, also available in Cowork and Claude Code. Directory plugins on Pro and up.
  https://claude.com/docs/plugins/overview
- Claude.ai connectors: Gmail, Google Calendar, Drive. Help Center lists search/read, drafts, labels, send with approval; the claude.com/docs connector pages say the Gmail and Calendar connectors are read-only. Treat write actions as "to confirm"; NT designs read-only first.
  https://support.claude.com/en/articles/10166901-use-google-workspace-connectors ; https://claude.com/docs/connectors/google/gmail ; https://claude.com/docs/connectors/google/calendar
- ChatGPT plugins: one plugin directory shared by ChatGPT and Codex; Plugins tab, open details, press +; skills bundled in plugins work in Chat and Work on web, desktop, mobile. Gmail and Google Drive plugins exist. Individuals: Personal tab with "Created by me" and "Shared with me". Public listing needs submission review.
  https://learn.chatgpt.com/docs/plugins ; https://learn.chatgpt.com/docs/skills-and-plugins ; https://learn.chatgpt.com/docs/build-skills
- ChatGPT skills: @skill-creator in ChatGPT; skills can be shared when workspace allows. Custom GPTs in Enterprise are being retired and moved to plugins (build-plugins page). A one-click public "Add to ChatGPT" link for NT: to confirm.
  https://learn.chatgpt.com/docs/build-plugins
- ChatGPT plugin packaging: root plugin.json with Agent Plugins $schema https://agent-plugins.org/schemas/1.0.0/plugin.schema.json, skills/ folder; marketplace at .agents/plugins/marketplace.json.
  https://developers.openai.com/plugins/build/plugins
- Grok skills (launched May 18, 2026, grok.com, iOS, Android): describe in chat, upload a file, or write one; "build and share your own skills". Upload formats (.zip, .skill, .md) and share links come from a third-party guide: to confirm.
  https://x.ai/news/grok-skills ; third party: https://www.payforchat.com/grok/articles/grok-skills-guide-2026
- Grok connectors: grok.com/connectors > New Connector; built-ins include Gmail and Google Calendar, Outlook Mail and Calendar, Google Drive, OneDrive; Custom MCP needs a public URL.
  https://docs.x.ai/grok/connectors

## Coding tools and agent harnesses (also supported)
- Claude Code: /plugin marketplace add owner/repo ; /plugin install name@marketplace ; shell: claude plugin install name --marketplace owner/repo (v2.1.292+). Manifest .claude-plugin/plugin.json (only name required), marketplace .claude-plugin/marketplace.json, skills/<name>/SKILL.md. Personal skills also load from ~/.claude/skills/.
  https://code.claude.com/docs/en/discover-plugins ; https://code.claude.com/docs/en/plugins-reference ; https://code.claude.com/docs/en/plugins
- Codex: codex plugin marketplace add owner/repo, then /plugins to install; codex plugin add name@marketplace. Skills folders: ~/.agents/skills/<name>/ or .agents/skills/. $skill-installer for local installs.
  https://developers.openai.com/plugins/build/plugins ; https://learn.chatgpt.com/docs/build-skills ; (codex plugin add syntax seen on third-party docs.arantic.com and a jsDelivr spec copy: to confirm on official docs)
- Cursor: install from Customize > Install, choose project or user scope. Cursor Plugin manifest .cursor-plugin/plugin.json (only name required); Agent Plugins root plugin.json also loads; multi-plugin .cursor-plugin/marketplace.json; local test in ~/.cursor/plugins/local. Marketplace listing is manually reviewed.
  https://cursor.com/docs/plugins.md ; https://cursor.com/docs/reference/plugins
- pi (pi-mono coding agent by Mario Zechner): skills follow Agent Skills; loads ~/.pi/agent/skills/, ~/.agents/skills/, .pi/skills/, .agents/skills/; packages: pi install git:github.com/user/repo or npm:..., package.json "pi": {"skills": ["./skills"]}, or auto-discovers skills/.
  https://registry.npmjs.org/%40mariozechner%2Fpi-coding-agent (README of @mariozechner/pi-coding-agent, repo github.com/badlogic/pi-mono)
- OpenCode: ~/.config/opencode/skills, also ~/.claude/skills and ~/.agents/skills (and project .opencode/.claude/.agents).
  https://opencode.ai/docs/skills/
- Goose: ~/.agents/skills/<name>/SKILL.md, .agents/skills, ~/.agents/plugins/<plugin>/.
  https://goose-docs.ai/docs/guides/context-engineering/using-skills/
- Hermes Agent: hermes skills install <url-to-SKILL.md> ; hermes skills tap add owner/repo ; skills in ~/.hermes/skills/.
  https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- Agent Skills spec: SKILL.md frontmatter name (lowercase, hyphens, matches folder) and description; optional scripts/ references/ assets/.
  https://agentskills.io/specification

## v4 additions (checked 2026-11-04)
- IRS Direct File: not available in filing season 2026, "No launch date has been set for the future" (AP News, Nov 2025, apnews.com/article/irs-direct-file-not-available-2026-04f2d0c31bec80b55d122a0e76e08c36); directfile.irs.gov says the pilot is closed; CRS IF13314 (suspended Oct 2025). Politico (Sep 2026): IRS says it is not reviving Direct File.
- IRS Free File: extended through Oct 2029 (IR-2024-145; 2024 amendment PDF on irs.gov). irs.gov/e-file-do-your-taxes-for-free: "closed, check back January 2027"; guided software AGI $95,000 or less last season; Fillable Forms any income, no state; sign with prior-year AGI or self-select PIN. 2027 AGI limit and partners: to confirm in January.
- Form 1040 check: irs.gov/pub/irs-pdf/f1040.pdf title "2025 Form 1040", 229 AcroForm fields plus an XFA layer (read with pypdf).
- .gov registry: github.com/cisagov/dotgov-data current-full.csv (public).
- NWS API: weather.gov/documentation/services-web-api (free for any use, User-Agent required, rate limits not public, /points, /gridpoints, /alerts/active, no radar display data).
- NPR feeds: npr.org rights-and-permissions and terms of use (personal noncommercial, attribution, no modification, no AI training).
- USDA FoodData Central: fdc.nal.usda.gov/api-guide (CC0, data.gov key, 1,000 req/hr/IP, downloads).
- Physical Activity Guidelines for Americans, 2nd ed.: odphp.health.gov executive summary.
- Tauri 2: v2.tauri.app/distribute (Linux: deb, Snap, AppImage, Flatpak, RPM, AUR; macOS notarization outside App Store; Windows installer), /plugin/updater (signing cannot be disabled), /distribute/sign/linux (AppImage GPG, not verified on launch), /distribute/rpm, /blog/tauri-20 (mobile).
- Omarchy: omarchy.org/manual (Arch + Hyprland + Quickshell), /manual/other-packages (Super + Space > Install > Package or AUR; omarchy pkg add), omarchylinux.org/reference/commands/omarchy-pkg-aur-install. Omarchy defaults avoid AUR (starryhope.com explainer, third party).
- Claude Desktop extensions (.mcpb): claude.com/docs/connectors/building/mcpb; support.claude.com/en/articles/10949351.
- Grok Bot: cursor.com/docs/grok-bot/settings.md (Connect apps lists apps and packaged skills; Execution on this computer with per-command approval), x.ai/bot/guides/grok-bot-101 ("supports the same MCP servers, plugins, and skills as Cursor"). Listing route and local MCP: to confirm.
- PWA: webkit.org/blog/13878 (web push for Home Screen web apps, iOS 16.4+), iOS 26 default "Open as Web App" (WebKit team note quoted at mjtsai.com/blog/2025/10/03/web-apps-in-ios-26), web.dev/articles/install-criteria, web.dev/learn/pwa/installation (WebAPK).
- Form libraries: github.com/Hopding/pdf-lib (MIT, last push 2024-07-17), pypdf 6.21.4 released 2026-10-28 (BSD), github.com/jbarrow/commonforms (no license file on GitHub; depends on ultralytics, AGPL-3.0: to confirm), huggingface.co/jbarrow/FFDNet-S and FFDNet-L, arxiv.org/abs/2509.16506.

## v5 additions (checked 2026-11-04)

### Converters and browser limits
- ffmpeg.wasm FAQ, https://ffmpegwasm.netlify.app/docs/faq : input files are limited to 2 GB (a WebAssembly memory limit). Mounting with WORKERFS helps with large inputs.
- npm @ffmpeg/core 0.12.10, https://www.npmjs.com/package/@ffmpeg/core : license GPL-2.0-or-later, because the build includes libx264 and libx265. The @ffmpeg/ffmpeg wrapper is MIT. An older issue (github.com/ffmpegwasm/ffmpeg.wasm/issues/107) discussed nonfree libfdk-aac in early builds.
- ffmpeg.wasm issue 623, https://github.com/ffmpegwasm/ffmpeg.wasm/issues/623 : users report iOS Safari crashes loading files of about 400 to 800 MB. NT's phone cap of about 300 MB is our own safety margin, to test.
- FFmpeg legal page, https://ffmpeg.org/legal.html : FFmpeg is LGPL 2.1 or later; optional GPL parts make the whole build GPL. The compliance checklist says: compile without --enable-gpl and --enable-nonfree, and distribute the source you used.
- wasm-vips README and THIRD-PARTY-NOTICES, https://github.com/kleisauke/wasm-vips , npm wasm-vips 0.0.19 (updated 2026-09-29): MIT wrapper; bundled libvips, glib, libheif, and libexif are LGPLv3 or similar. Needs Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp for SharedArrayBuffer. No HEVC decoder is listed, so HEIC decoding in the browser is "to confirm".
- Mediabunny, https://mediabunny.dev and https://github.com/Vanilagy/mediabunny : MPL-2.0, pure TypeScript, built on WebCodecs, streams files of any size, reads and writes MP4, MOV, WebM, MKV, MP3, WAV, Ogg, and FLAC. MPL-2.0 allows use in closed or open projects; changes to its own files must be shared.
- caniuse WebCodecs, https://caniuse.com/webcodecs : Chrome and Edge 94+, Firefox 130+ desktop (none on Firefox for Android), Safari 26+ full; Safari 16.4 to 18.7 video only. AAC encoding is missing in some browsers.
- pandoc 3.9 release (2026-02-03), https://github.com/jgm/pandoc/releases : official pandoc.wasm build. Discourse and release notes: about 16 MB compressed, about 58 MB uncompressed; no network access, no system commands, and no PDF by itself. pandoc.org/app pairs it with Typst compiled to WebAssembly for PDF and runs in the browser. Pandoc is GPL-2.0-or-later.
- api.weather.gov response header check on 2026-11-04: access-control-allow-origin: * (so browser requests work).

### Tool search
- Hugging Face Xenova/all-MiniLM-L6-v2, https://huggingface.co/Xenova/all-MiniLM-L6-v2 : runs in Transformers.js; 384-dimension embeddings; the quantized uint8 ONNX file is about 22 MB. Multilingual quality (Spanish) is "to confirm"; a multilingual model may be needed.
- The pass bars (90% top-1, 98% top-3, 90% no-fit, under 100 ms) are NT's own targets, not measured results.

### Evidence used by "How we pick tools"
- FTC Consumer Sentinel 2025 data, reported in FTC testimony to the Joint Economic Committee (2026-03-25) and summaries by AARP and Experian: 3,025,103 fraud reports; $15.86 billion lost (up from $12.78 billion in 2024); imposter scams 1,005,012 reports and $3.51 billion; investment scams $7.93 billion; text messages the most common contact method. AARP, citing FTC: people 50 and older reported $4.3 billion lost.
- FBI IC3 2025 Internet Crime Report, https://www.ic3.gov : $20.877 billion in reported losses; people over 60 reported $7.748 billion. (Not shown on the page; kept as backup evidence.)
- IRS information collection notice, Federal Register 2025-12-15, Vol. 90, No. 238, document 2025-22707 (govinfo): 170,100,000 individual responses; 11 hours 27 minutes average per response; $49.76 billion total out of pocket; $42.028 billion monetized time; $91.788 billion total monetized burden. "About $290 per return" is our own division ($49.76 billion / 170.1 million = $292.5), not an IRS figure.
- C+R Research subscription survey (2022, 1,000 US consumers), https://www.crresearch.com/blog/subscription-service-statistics-and-costs/ : people estimated $86 a month; their itemized total was $219.
- Pew Research Center, "Tech Adoption Climbs Among Older Adults" (2017): 48% of older internet users say they usually need someone to set up a new device or show them how. Due for a newer source.
- FTC consumer alert (2023-10), https://consumer.ftc.gov/consumer-alerts/2023/10/you-now-have-permanent-access-free-weekly-credit-reports : free weekly credit reports from Equifax, Experian, and TransUnion are permanent at AnnualCreditReport.com.
- Official sites that returned HTTP 200 on 2026-11-04: https://www.usa.gov/benefit-finder (title "Find government benefits and financial help | USAGov"), https://www.annualcreditreport.com , https://www.identitytheft.gov , https://reportfraud.ftc.gov .
- Help-forum and search-trend counts: method step only; no numbers collected yet, none shown.

### To confirm (v5)
- Lawyer review of the license mix (LGPL FFmpeg build, LGPLv3 libvips parts, GPL pandoc as a separate module, MPL-2.0 Mediabunny, NT's own code under MIT).
- HEIC decoding per browser; AAC encoding per browser; the phone file-size cap in real tests.
- Static hosting free-tier limits, wasm bandwidth cost, Windows code signing cost, Apple Developer Program cost.
- GitHub Actions free for public repos for the Form Finder index job.
- Standalone nt packages for Homebrew, winget, and AUR.
- Multilingual search model choice.

## v5 work additions (checked 2026-11-04, ET)

### IRS Free File and tax facts (for v5-work/form-filler-free-file.md)
- https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free : "IRS Free File has closed. Please check back January 2027." Guided tax software "For $95,000 adjusted gross income (AGI) or less"; Fillable Forms "For any income level", "Limited calculations used", "No state tax filing". "Always go through the IRS.gov site ... You won't get IRS Free File if you go directly to a partner's commercial website." Each partner sets its own eligibility (income, age, state residency). Current-year returns only. Sign with prior-year AGI or a 5-digit self-select PIN (any five numbers except all zeros); first-time filers can create a PIN or enter $0 as AGI. Prior-year AGI is in the IRS online account under Tax Records, or a transcript by mail. Program rules: "No upselling of additional services or hidden fees permitted. Selling of bank products, such as a refund anticipation loan (RAL), audit protection or other services are prohibited." A guided partner may charge for state returns, for filers outside its criteria, or above the AGI threshold. Rejected returns can usually be corrected and resubmitted before the deadline.
- https://www.irs.gov/e-file-providers/free-file-fillable-forms-program-limitations-and-available-forms : Fillable Forms is an online program. Negative amounts need a minus sign; no attaching statements except the program's own; Form 1040-SR not supported (use Form 1040); filing season 2026 forms available 01/26/2026, including Form 1040, Schedules 1, 1-A, 2, 3, C, EIC, SE, 8812, and Forms 8863, 8880, 8962.
- https://www.irs.gov/individuals/gather-your-documents (updated 26-Oct-2026): SSN or ITIN for everyone on the return; bank routing and account numbers; prior-year AGI and refund amount; self-select PIN; IP PIN if issued; W-2; 1099-K, 1099-G, 1099-INT, 1099-DIV, 1099-NEC, 1099-R, SSA-1099, 1099-MISC, 1095-A; records for child care, education, retirement contributions, side-job income and expenses.
- https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit-eitc (updated 03-Nov-2026): "Beginning with tax year 2026, you must complete Schedule 3-A, Federal Public Benefit, if you are claiming the Earned Income Tax Credit." Refunds with EITC can't be issued before mid-February. EITC Assistant available.
- https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/earned-income-and-earned-income-tax-credit-eitc-tables : tax year 2025 AGI limits (single, HOH, MFS, QSS / MFJ): 0 children $19,104 / $26,214; 1 child $50,434 / $57,554; 2 children $57,310 / $64,430; 3 or more $61,555 / $68,675. Investment income limit $11,950. Maximum credit: $649, $4,328, $7,152, $8,046. Gig and self-employment income count as earned income; Social Security, pensions, and unemployment don't.
- https://www.irs.gov/credits-deductions/individuals/child-tax-credit : tax year 2025, up to $2,200 per qualifying child; ACTC up to $1,700 per child; earned income of at least $2,500 for ACTC; child under 17, lived with you more than half the year, SSN valid for employment for you and each child; full credit up to $200,000 income ($400,000 joint). Credit for Other Dependents up to $500. Claim on Form 1040 with Schedule 8812.
- https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-savings-contributions-savers-credit : 50%, 20%, or 10% of up to $2,000 in contributions ($4,000 MFJ); max credit $1,000 ($2,000 MFJ); must be 18 or older, not a dependent, not a full-time student (5 months rule). The page's newest table is 2024 (50% tier: MFJ $46,000, HOH $34,500, others $23,000); 2025 and 2026 limits: to confirm from Form 8880 instructions. Claimed on Form 8880.
- https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers : VITA "generally" for people who make about $70,244 or less, persons with disabilities, limited-English speakers; no program-wide income limit (sites set their own); TCE focuses on people 60 and older; VITA locator or 800-906-9887.
- https://www.irs.gov/wheres-my-refund : status available 24 hours after e-filing a current-year return; e-filed refunds typically 3 weeks; EITC and ACTC refunds held until mid-February; refunds can be reduced for past-due debts (Bureau of the Fiscal Service mails a notice); automated hotline 800-829-1954; "the IRS app".
- https://www.irs.gov/pub/irs-pdf/f1040.pdf (title "2025 Form 1040"): line 1a is W-2 box 1 total; line 9 total income; line 10 adjustments from Schedule 1 line 26; line 11a adjusted gross income; line 15 taxable income (line 11b minus line 14); line 24 total tax; line 27a earned income credit; line 28 ACTC from Schedule 8812; line 33 total payments; line 34 overpaid; line 35a refund. Line numbers change by year; tests read them from each year's form.
- IRS MeF Assurance Testing System, https://www.irs.gov/e-file-providers/tax-year-2025-form-1040-series-and-extensions-modernized-e-file-mef-assurance-testing-system-ats-information : the IRS publishes official TY2025 Form 1040 test scenarios (1 to 8, 12, 13) as PDFs with fictional taxpayers, for software developers. NT uses them as an extra independent check where a scenario matches a case. Whether NT can use ATS itself (it needs an e-file provider relationship): to confirm.

### Agents path (for v5-work/agents-skills-tools.md)
- llms.txt proposal v2 (Jeremy Howard, first published 2024-09-03, updated 2026-08-10), https://llmstxt.org/ : `/llms.txt` at the site root or any subpath; required H1, then a blockquote summary, optional detail sections, and H2 "file lists" of `[name](url): notes`; an "Optional" section for skippable links; Markdown page copies at the same URL plus `.md`; `rel="alternate" type="text/markdown"` and `rel="describedby"` link relations.
- GitHub artifact attestations, https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations and https://cli.github.com/manual/gh_attestation_verify : Sigstore-signed build provenance from GitHub Actions; check with `gh attestation verify <file> -R owner/repo`; default predicate SLSA provenance v1; offline checks with `--bundle` and `--custom-trusted-root`.
- Platform install routes: see "Chat apps" and "Coding tools and agent harnesses" above (Claude, Claude Code, ChatGPT, Codex, Grok, Cursor, pi, OpenCode, Goose, Hermes, Agent Skills spec) and v4 additions (Grok Bot, .mcpb).

### Document converter engines (for v5-work/file-converter-quality.md)
- LibreOffice command line, https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html : `--headless`, `--convert-to OutputFileExtension[:OutputFilterName[:Params]] [--outdir dir]`, `--infilter=`, `-env:UserInstallation=` for a separate profile. LibreOffice license MPL-2.0 (with LGPL-3.0+ parts).
- ZetaOffice and zetajs (allotropia), https://github.com/allotropia/zetajs , https://blog.allotropia.de/2024/11/08/launching-zetaoffice/ , https://zetaoffice.net/ : LibreOffice compiled to WebAssembly, running fully in the browser, including headless document conversion; zetajs MIT (npm zetajs 1.2.0); needs COOP same-origin and COEP require-corp; services in open beta; WASM sources published on git.libreoffice.org (distro/allotropia/zeta-24-2). The third-party project github.com/cordi-athas/embeddocxeditor pins a build of about 52 MB and describes the payload as MPL-2.0 / LGPL-3.0+ (payload size: to confirm on our own build).
- pdf2docx, https://pypi.org/project/pdf2docx/ : by Artifex, relicensed MIT, "no longer actively maintained by Artifex"; depends on PyMuPDF >= 1.26.7. PyMuPDF (pypi and GitHub): dual licensed GNU AGPL-3.0 or Artifex commercial.
- OCRmyPDF, https://github.com/ocrmypdf/OCRmyPDF : MPL-2.0 (pypi 17.13.0); requires Ghostscript and Tesseract installed. Ghostscript (ArtifexSoftware/ghostpdl) is AGPL or commercial per Artifex (GitHub shows NOASSERTION, so the exact terms are to confirm).
- Tesseract, https://github.com/tesseract-ocr/tesseract : Apache-2.0. Tesseract.js 7.0.0 (npm), https://github.com/naptha/tesseract.js : Apache-2.0, runs in browsers and Node via a WebAssembly port; "does not support PDF files". Scribe.js (an alternative that reads PDFs) is AGPL-3.0.
- qpdf (Apache-2.0) and pdf.js (Apache-2.0), per GitHub license metadata.
