# File Converter: office documents and messy files

Plan only. This raises the bar for the Document Converter (tool 34) and the File Converter family: converting the real files people have, not just clean samples. Engine and license facts were checked November 4, 2026 (ET). Sources are in `PLATFORM-SOURCES.md` under "v5: document converter engines".

## The promise, in plain words

- NT changes your document into the type you need: PDF to Word, Word to PDF, PowerPoint to PDF, Excel to PDF, old files to new ones, and more.
- It works on the files people really have: scanned papers, crooked photos of pages, tables, two-column layouts, footnotes, odd fonts, and very old Office files.
- **If NT can't do a good job, it tells you.** You'll see a message like: "This PDF is a scan with faint text. About 1 in 10 words may be wrong. Open it in the NT App for a better result, or check these 3 pages." It never quietly hands back a bad file.
- Your file stays on your phone or computer. NT has no paid conversion servers, so it costs you nothing and nobody else sees your file.

## Where each conversion runs

**"Website"** means in the web browser on the person's device. **"NT App"** means the free desktop app, plus the `nt` command. NT never uses a paid server, so a conversion that can't be done well on the device goes to the NT App. It never goes to the cloud.

| From → to | Website | NT App and nt command | Engine | Quality note |
|---|---|---|---|---|
| Word (DOCX, DOC, ODT, RTF) → PDF | Computer browsers: yes, using LibreOffice in WebAssembly (ZetaOffice). Phones: to confirm (large download) | Yes | LibreOffice | LibreOffice's own layout engine. Best option for fidelity |
| Word ↔ Word types (DOC → DOCX, DOCX ↔ ODT, RTF → DOCX) | Computer browsers: yes (ZetaOffice) | Yes | LibreOffice | Legacy .doc opens through LibreOffice's import filters |
| PowerPoint (PPT, PPTX, ODP) → PDF | Computer browsers: yes (ZetaOffice) | Yes | LibreOffice | Fonts that aren't installed get swapped. NT lists any swaps |
| PPT ↔ PPTX ↔ ODP | Computer browsers: yes (ZetaOffice) | Yes | LibreOffice | Animations and embedded video may not carry over. NT warns |
| Excel (XLS, XLSX, ODS, CSV) → PDF | Computer browsers: yes (ZetaOffice) | Yes | LibreOffice | Wide sheets are scaled to fit the page. NT reports the page count |
| XLS ↔ XLSX ↔ ODS ↔ CSV | Computer browsers: yes (ZetaOffice); CSV ↔ XLSX also with a small JS library | Yes | LibreOffice | CSV keeps one sheet only. NT says so when there are several |
| Text PDF → Word (DOCX) | **No.** Routed to the NT App | Yes | pdf2docx (MIT, but needs PyMuPDF: AGPL-3.0 or commercial, see licenses) or LibreOffice PDF import as a fallback | Reflow is hard. Every result gets a fidelity score |
| **Scanned PDF or photo** → Word or searchable PDF | Small jobs only (a few pages), with Tesseract.js OCR. Above that, routed to the NT App | Yes | Tesseract (Apache-2.0) via OCRmyPDF (MPL-2.0) for searchable PDFs, plus layout rebuild for DOCX | OCR errors are measured. Low confidence means a plain warning and the pages are flagged |
| Markdown, HTML, EPUB, plain text, DOCX ↔ each other | Yes | Yes | pandoc (GPL-2.0-or-later; pandoc.wasm in the browser) | Good for text-heavy files. Complex Word layout goes through LibreOffice instead |
| Any office type → EPUB (ebook) | Yes (pandoc) | Yes | pandoc, or LibreOffice then pandoc | Images and headings kept. Page layout isn't (ebooks reflow) |
| Images ↔ images, video, audio | See tools 31 to 33 | Yes | wasm-vips, Mediabunny, an LGPL FFmpeg build | Unchanged from v5 |
| Password-protected files | Asks for the password and opens it on the device only. Never stores it | Yes | LibreOffice, qpdf | Wrong password: plain message |
| Corrupt or half-downloaded files | Tries to repair; if it can't, says so | Yes | LibreOffice recovery, qpdf | Never outputs a partly empty file without saying so |

**Not offered, or offered with a clear warning:**
- PDF → PowerPoint and PDF → Excel. Rebuilding slides or real spreadsheet formulas from a PDF is unreliable with the open tools. NT offers "tables from this PDF into a spreadsheet" only when it detects real tables, with a fidelity score. Otherwise it says it can't do this well.
- Converting files with macros. NT converts the content, removes the macros, and says it did.
- Track changes and comments. NT keeps them where the target type supports them (DOCX ↔ ODT). Going to PDF, it asks: "Show the changes, or the final version?"

## The engines, honestly

| Engine | What it's for | License | Runs in the browser? | Notes |
|---|---|---|---|---|
| LibreOffice headless (`soffice --headless --convert-to`) | All office types, both ways, legacy .doc/.ppt/.xls | MPL-2.0 (some parts LGPL-3.0+) | Not natively | The reference engine in the NT App and the nt command |
| ZetaOffice (LibreOffice compiled to WebAssembly, by allotropia) with zetajs | Office conversions in the browser | zetajs MIT; the WASM payload MPL-2.0 / LGPL-3.0+ | Yes. Needs COOP/COEP headers. Open beta. One project pins a build of about 52 MB | Computer browsers first. Phone memory limits: to confirm. Self-host the pinned build (no paid CDN). Offer its source |
| pdf2docx 0.5.x (Artifex) | Text PDF → DOCX with tables | MIT since its relicensing; no longer maintained by Artifex | No (Python) | Depends on PyMuPDF, which is AGPL-3.0 or commercial. Before shipping, either confirm NT can meet AGPL terms or replace it (to confirm with a lawyer) |
| Tesseract 5 | OCR engine | Apache-2.0 | Via Tesseract.js | Language packs per language |
| Tesseract.js 7.0.0 | OCR in the browser | Apache-2.0 | Yes | Works on images only, not PDFs. NT renders PDF pages to images first (pdf.js) |
| OCRmyPDF 17.x | Adds a searchable text layer to scanned PDFs | MPL-2.0 | No | Needs Ghostscript and Tesseract installed. Ghostscript is AGPL-3.0 or commercial (to confirm the bundling terms) |
| pandoc 3.9 / pandoc.wasm | Text formats, EPUB, Markdown, HTML | GPL-2.0-or-later | Yes (pandoc.wasm, about 16 MB compressed) | Ships as a separate module, with its source offered |
| qpdf | PDF repair, decryption with the person's password, checks | Apache-2.0 (to confirm) | To confirm | Used for checks and repair |

**Cost rule, kept visible:** every engine above runs on the person's device. NT pays only for static hosting of the code files, which are downloaded once and cached. When a conversion is too heavy for a phone browser (big office files, long scans), NT says so and offers the NT App. It never sends the file to a server.

## How NT knows a result is poor (so it can say so)

After every conversion, NT checks the output against the source before handing it back:
- **Text check:** extract text from both files and compute the character error rate (CER). For scans, use OCR confidence.
- **Structure check:** tables (rows × columns), heading count, list count, footnote count, and image count. For slides, the slide count.
- **Page check:** page count stays within the expected range for that pair.
- **Opens cleanly:** the output must reopen in LibreOffice headless without repair prompts.

If any check is under its bar, NT shows a plain message: what went wrong, which pages, and what to do (try the NT App, check pages 3 to 5, or keep the original). The person can still download the file, but only after seeing the warning. **Below the hard floor (for example, CER over 10% on a text PDF, or a lost table), NT won't offer the file as "done".**

## For builders

- Routing table lives in `converters/routes.json`: pair, surface, engine, bars, fallback. The router picks the best engine per pair and surface and never a server.
- Browser office path: pin a ZetaOffice build by SHA-256, self-host it same-origin (COOP/COEP already required for wasm-vips), and lazy-load it only for office pairs. Measure first-load size and memory on low-end phones before enabling phones (to confirm).
- Desktop: bundle LibreOffice or detect an installed one (install size and licensing to confirm). Run each conversion in a fresh profile (`-env:UserInstallation`) with a timeout.
- Bars and the hard floor are per pair, in `converters/bars.json`, and come from the test suite in test-design.md section 12. Changing a bar needs a recorded before and after run.
- License review before launch: PyMuPDF (AGPL) through pdf2docx, Ghostscript (AGPL) through OCRmyPDF, and LibreOffice WASM (MPL/LGPL) redistribution. Alternatives if AGPL is a problem: LibreOffice's PDF import plus our own reflow, or an MIT/Apache PDF parser (to evaluate).
