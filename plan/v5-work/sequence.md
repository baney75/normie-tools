# NT plan v5: suggested order

Plan only. Two tracks run side by side: the wording rewrite (`rewrite-plan.md`) and the test suite (`test-design.md`).

## Rewrite order

**Pass 1: what a normal person sees first**
1. The tagline everywhere: "ask your agent" becomes "ask your AI app" (cover, page footers, brand sheet p94).
2. Cover (p1): drop the nt command card, the Effort and Wow key, and "Ship these 5 first"; fix "every dollar traces back to your own rows".
3. Shared template fixes T1 to T17 (Effort/Wow box, chips, .ics, CSV steps, "tile", "wireframe", "to confirm"). One edit fixes 76 tool pages.
4. Install (p5): move "to confirm" notes and the Linux package names out of the steps.
5. The top 5 tool pages: Save Me Money (p17), Tax Filing Helper (p32, AGI, VITA, fact box), Form Filler (p37 to p38), Photo Duplicate Finder (p54), Morning Briefing (p66).
6. Index (p2), Reliability promise (p4), Finding the right tool (p6), website pages (p7, p8), NT App home and task screens (p10, p11).

**Pass 2: the rest**
7. Costs (p9): split into a plain top half and a For builders bottom half.
8. Agents (p14) and My Info (p15).
9. The 13 fact boxes (T10): plain facts stay, while library, license, and API details move to For builders. Converters (p48 to p51), weather (p67), and calorie (p83) are the worst.
10. Remaining tool pages, group by group, in index order.

**Pass 3: labels**
11. Label p13 (nt command) and p94 (brand sheet) as For builders. Move p37's launch post and skill path into its For builders panel.

## Test build waves

| Wave | What | Tools covered | Depends on |
|---|---|---|---|
| 0. Shared harness | Fixture generator and linter (made-up data only), property library (cents, no change before plan, Trash only, undo byte-identical, no network, official links, file validators), run records, mocks (mailbox, calendar, NWS, IRS and Free File screens, recorded pages), the 1,500-request router eval, and the banned-words and reading-level checker from the glossary | none yet | nothing |
| 1. Top 5, testable now | Save Me Money with the three tools it hands off to (Subscription Finder, Bill Negotiation Prep, Cheaper Plan Finder); Form Filler plus Form Finder; Tax Filing Helper with Tax Checklist and Tax Folder Organizer (mock filing site; the agent must stop on the review page); Morning Briefing with Weather and News Briefing | 12 | Wave 0 |
| 2. Rest of testable now | Money, taxes, forms, email, calendar, contacts, home, health, work, and safety tools, plus Unit Converter, ID Photo Maker, Share-Safe Photos, and PDF tools. Also prototype the Photo Duplicates grouping as a script now | 49 (61 testable now in all) | Wave 0 |
| 3. Engine and NT App | Engine plus the `nt` command with Downloads Tidy and Storage Checker first (the app build order), then Photo Duplicate Finder (top 5 #4), then the other 8 file tools. Adds undo byte-identical tests on 5 OSes, delete interception, `nt`/MCP cross-surface tests, and the app-only parts of Price Drop Watch (weekly checks) and Weather (alerts) | 11 | Engine built; Wave 0 |
| 4. Converters | Image Converter first (simplest, most asked for), then Audio, Video, and Document. Adds the browser matrix (Safari 16.4 / 18 / 26, Chrome, Edge, Firefox desktop and Android), no-network checks, the phone size cap, and license notices in the build | 4 | Converter modules built; Wave 0 |

The router eval and the cross-surface replays run on every wave from Wave 0 on. A tool counts as done when its suite passes on every surface it claims and its run record is on the release page.
