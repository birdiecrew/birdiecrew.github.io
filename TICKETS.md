# Birdie Crew: tickets

The plan (`PLAN.md`) split into small tickets. Each one has a single outcome, takes at most about a day, and says how we know it is done. Update the **Status** column as work moves, and the summary table below.

Last updated: 2026-11-07 (the site is built; see README.md for the smoke test).

## How to read this

| Status | Meaning |
|---|---|
| **Done** | Finished. Nothing more to do. |
| **Built** | Works on the real site and is covered by tests that run on every push. Still to do: check it on a real phone. |
| **In progress** | Someone is working on it now. |
| **To do** | Not started. |
| **Parked** | Deliberately not in version 1. |

Size is the work still left: **XS** under an hour, **S** half a day, **M** about a day. Anything larger has been split. "Needs" lists tickets that must be finished first. A ticket is only **Done** when its "Done when" line is true.

## Progress

| Epic | Done | Built | In progress | To do | Parked | Total |
|---|---|---|---|---|---|---|
| **P** Plan and prototype | 7 | 0 | 0 | 0 | 0 | 7 |
| **A** Agree it with the coach | 4 | 0 | 0 | 1 | 0 | 5 |
| **B** Prove the risky parts on a real phone | 1 | 0 | 0 | 9 | 0 | 10 |
| **C** The real site (foundation) | 6 | 1 | 0 | 2 | 0 | 9 |
| **D** Rules engine | 1 | 15 | 0 | 0 | 0 | 16 |
| **E** Storage and the save file | 4 | 5 | 0 | 0 | 1 | 10 |
| **F** Coach page: first run and frame | 0 | 9 | 0 | 0 | 0 | 9 |
| **G** Coach page: daily jobs | 1 | 16 | 0 | 0 | 0 | 17 |
| **H** Cards for students | 0 | 12 | 0 | 0 | 0 | 12 |
| **J** Quality | 2 | 0 | 1 | 4 | 0 | 7 |
| **K** Hand-over | 0 | 0 | 0 | 5 | 0 | 5 |
| **L** Later (not version 1) | 0 | 0 | 0 | 0 | 7 | 7 |
| **All** | **26** | **58** | **1** | **21** | **8** | **114** |

Counting only the product (not epic P) and leaving out the parked tickets: **77 of 99 are built and tested (19 done, 58 built and waiting for a real phone check).** What is left is mostly people and phones: A1, B1 to B8, J2 to J6 and the hand-over. The "Built" tickets become Done after the phone checks in epic B and J4.

## Suggested order

1. **P7** merge the plan and prototype, so everything below starts from `main`.
2. **A1** and **B1 to B8** in parallel: show her the live site, and run the phone experiments. These can still change the plan. **B3** needs seven days, so start it first. (A2 to A5 and B9 are already answered or tried; A1 is where she confirms the answers.)
3. **B10** to write down what the phones taught us.
4. **C1 to C8**, the real site and its address. Then **D16** so tests run on every push.
5. **Skills first:** promote **E** (storage) just enough to save, then **G13**, **G14** and **H7** (scores, videos, the Skills page). After that **E**, **F** (first run), **G** (daily jobs) and **H** (cards), with **G17** (Copy reply) right after **H3**.
6. **J** (quality) as each epic lands, then **K** (hand-over).

## P. Plan and prototype

The written plan and the first click-through pages. The pages became the real site.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| P1 | Write the plan (rules, flows, access, risks, tests) | S |  | **Done** | `PLAN.md` covers rules, screens, storage, privacy, hand-over, test lists |
| P2 | Click-through mockups of the coach page and the card | M |  | **Done** | Both pages opened with made-up data (they are now the real site) |
| P3 | Rules engine as testable code | M |  | **Done** | `assets/core.js` runs in the browser and in node |
| P4 | Random-sequence rules test (8 seeds) | S | P3 | **Done** | `rules-fuzz.js` reports no violations |
| P5 | Scenario tests: rules, ask, money, cards, timetable, storage, texts | M | P3 | **Done** | `run-all.js` passes (about 150 checks) |
| P6 | Screen tests in a browser (53) | M | P2 | **Done** | `tests/ui-tests.html` passes at 375 and 320 px |
| P7 | Open PR #4 with mockups, tests and plan | XS | P1 | **Done** | Merged into `main` |

## A. Agree it with the coach

Nothing here is code. The biggest risk in the plan is that she does not want it.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| A1 | Show the coach the mockups on her own phone | S | P7 | **To do** | She has tapped through the wizard and a card, and said what felt wrong |
| A2 | Answer the workload questions (requests a day, live card or not, one device or two, the extra step per request) | S | A1 | **Done** | Answered by the owner on 2026-11-07 (all fine for now); the coach confirms in A1 |
| A3 | Answer the rule questions (fees, flexible students, cancelled credit, reminders) | S | A1 | **Done** | Answered by the owner: they match; flexible students are rare; the coach confirms in A1 |
| A4 | Decide the hand-over model and fee | XS | A1 | **Done** | Decided: discussed offline between the two of them |
| A5 | Decide whether skills move earlier in the build order | XS | A1 | **Done** | Decided: skills first; the plan's build order says so |

## B. Prove the risky parts on a real phone

One afternoon of experiments. Each one is small and each can change the design, so do these before the big build.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| B1 | Save a file through the share sheet (iPhone Safari, Android Chrome) | S |  | **To do** | The file lands in Files or Zalo and has the right name |
| B2 | Open a file with the file picker on both phones | S | B1 | **To do** | The saved file opens and the class appears |
| B3 | Working copy survives a week, in a tab and on the Home Screen | S |  | **To do** | Data still there after 7 days; result written down (starts the clock early) |
| B4 | Ask the browser to keep storage safe (persist) and see what iOS and Android answer | XS | B3 | **To do** | Answer recorded for each phone |
| B5 | A card link opens inside the Zalo in-app browser | S |  | **To do** | The card draws and is remembered after closing Zalo |
| B6 | Compression works in the Zalo browser, and the plain fallback works when it does not | XS | B5 | **To do** | Both link kinds open |
| B7 | Copying a message works on iPhone Safari and in the Zalo browser | XS |  | **To do** | Pasting into Zalo gives the full text |
| B8 | The coach's Zalo number opens her chat from the card | XS |  | **To do** | Tapping Ask opens Zalo with the right person |
| B9 | The meta Content-Security-Policy really blocks network calls | S |  | **Done** | Tried: `tests/csp-check.html` blocks all 28 attacks on both pages in Chrome. iPhone Safari is checked again in J4 |
| B10 | Write the findings and fallbacks into the plan | XS | B1 to B9 | **To do** | Plan open questions 13 to 15 are closed |

## C. The real site (foundation)

Turn the prototype into the two real pages. Done in the `site` branch.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| C1 | Lay out the site: `/` is the card, `/admin/` is the coach page, shared files in one folder | S | P7 | **Done** | Both addresses open on GitHub Pages |
| C2 | Remove the mock banner, the dark review controls and the "Reset" buttons | XS | C1 | **Done** | No mockup wording or controls on either page |
| C3 | Use the real date in Vietnam time instead of the fixed mock date | S | C1 | **Done** | Tests run with a fake clock; the page shows today correctly around midnight |
| C4 | A card page with no link and no saved card shows a short friendly screen, not the demo student | XS | C2 | **Done** | Opening `/` cold says to ask the coach for a card |
| C5 | Security meta tags (policy, no referrer, no indexing) on both pages, and no outside requests | S | B9 | **Built** | Tags are in the mockup pages; confirm the Network tab shows only the site's own files once live |
| C9 | No inline scripts: the theme is applied by a small file | XS | C5 | **Done** | `theme-boot.js`; the policy allows scripts only from the site itself |
| C6 | Show the app version in My data | XS | C1 | **To do** | Version number visible and written into saved files |
| C7 | Home Screen install: name, icon, theme colour for the coach page | S | C1 | **To do** | Installs on both phones and opens full screen |
| C8 | Publish from `main` and check the build status | XS | C1 | **Done** | Pages build is green after a merge |

## D. Rules engine

Built and tested. The same code the prototype ran is now the shipped file, with the real date in Vietnam time.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| D1 | Dates and months in one time zone, no daylight-saving surprises | S | C3 | **Built** | Tests pass with the clock set across month and year ends |
| D2 | Sessions: seats, extra seats, courts to book, over capacity (venue cap enforced) | S | P3 | **Built** | Tests for 8, 9 and 16 people and the 4-court limit pass |
| D3 | Skip with notice earns a credit; four skips give three credits | S | P3 | **Built** | Rules tests pass |
| D4 | Undo a skip and hand the freed credit to the next skip | S | P3 | **Built** | Rules tests pass |
| D5 | Make-up: pick the right credit, courtesy make-up when none | S | P3 | **Built** | Rules tests pass |
| D6 | Move or cancel a make-up | XS | D5 | **Built** | Rules tests pass |
| D7 | Flexible students: add and remove sessions | S | P3 | **Built** | Rules tests pass |
| D8 | Planned breaks: short versus long, remove, no stranded make-ups | S | P3 | **Built** | Rules tests pass |
| D9 | The coach cancels a session: free credit, once only | S | P3 | **Built** | Rules tests pass |
| D10 | Soft and hard rules, "Do it anyway", and the log of bent rules | S | P3 | **Built** | Every forced change is in the log; a plain change is not |
| D11 | What a student may ask on each kind of day (make-up, extra lesson, none) | S | D5 | **Built** | Ask tests pass |
| D12 | Fees by days a week and a student's own fee | S | P3 | **Built** | Money tests pass |
| D13 | Part-month bills and the credit on the next bill | S | D12 | **Built** | Every bill is a whole number of thousands |
| D14 | Due dates, first bill, late from the 6th | S | D12 | **Built** | Money tests pass |
| D15 | Timetable changes start today and never rewrite the past | M | P3 | **Built** | Timetable tests pass |
| D16 | Run all tests on every push (GitHub Action) | S | C8 | **Done** | A failing test turns the check red on the PR |

## E. Storage and the save file

The coach's data lives in her browser and in a file she keeps.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| E1 | Working copy saved after every change, with the last five earlier copies | S | P3 | **Built** | Reload loses nothing; earlier copies restore |
| E2 | Save file with version and fingerprint | S | B1 | **Built** | Round-trip test passes; file named with the date |
| E3 | Open file with plain-language errors (not ours, newer, edited, damaged) | S | B2 | **Built** | Each error has its own message |
| E4 | Save icon, "Not saved" state, Start over locked until saved | S | E2 | **Built** | Icon follows the data; Start over dimmed when unsaved |
| E5 | Ask for persistent storage and warn if the browser refuses | S | B4 | **Done** | A refusal shows a short note and the save icon stays prominent |
| E6 | A nudge to save after a week without a file | S | E4 | **Done** | Icon turns primary and a banner appears after 7 days |
| E7 | File format upgrades (version 1 to 2) with a test file from the old version | S | E2 | **Done** | An old file opens and is upgraded; an old page refuses a newer file |
| E8 | Export report as CSV for Google Sheets | S | P3 | **Built** | Opens in Sheets with one row per student per month |
| E9 | Support copy: save a file with every name replaced by S1, S2, ... | S | E2 | **Done** | The copy reproduces a bug without any real name |
| E10 | Yearly archive: start a new year's file with the students carried over | M | E7 | **Parked** | Not needed in version 1 |

## F. Coach page: first run and frame

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| F1 | Start screen: New class, Open file, Sample | S | E3 | **Built** | Three buttons, one line of text |
| F2 | Wizard step 1: class days, times, courts, fees with limits | S | F1 | **Built** | Fees cannot cross; last day cannot be switched off |
| F3 | Wizard step 2: paste names, clean them, count them | S | F1 | **Built** | Bullets, repeats and long names handled |
| F4 | Wizard step 3: days for everyone, then the exceptions, with a Flex chip (flexible students are rare: no more work) | S | F3 | **Built** | Next dims until everyone has days or Flex |
| F5 | Wizard step 4: who has paid this month | XS | F4 | **Built** | All and None work |
| F6 | Wizard step 5: save the file, or skip on purpose, then open the class | S | E2 | **Built** | Finish dimmed until saved or skipped |
| F7 | Header, icon-only bottom bar with badges, top bar on a laptop | S | C1 | **Built** | Bar moves to the top at 900 px |
| F8 | Vietnamese by default; language and light/dark switches in More | S | C1 | **Built** | Choice remembered; follows the system theme |
| F9 | Full pages that slide in with a back arrow; sheets only for one-tap actions | S | C1 | **Built** | Forms are pages, a day is a sheet |

## G. Coach page: daily jobs

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| G1 | Next 14 days with courts to book and over-capacity warning | S | D2 | **Built** | Counts match the rules tests |
| G2 | Session detail: names, extra seats, courts available, add a student | S | G1 | **Built** | Steppers stop at their limits |
| G3 | Students list: search, filters only when non-empty | S | C1 | **Built** | No chip with a zero count |
| G4 | Add and edit a student: Name, Days with Flex, Start, Fee, with a short reason when blocked | M | G3 | **Built** | Save dims with the right reason for each mistake |
| G5 | A student's own calendar with warnings and Do it anyway | M | D10 | **Built** | Every day action works from the calendar |
| G6 | Pause and resume a student | XS | G4 | **Built** | Paused students leave the sessions |
| G7 | Payments: month list, Paid and Undo, change an amount | S | D13 | **Built** | No future month; late tag only when late |
| G8 | Remind: copy a reminder per student, announcements for cancelled sessions | S | G7 | **Built** | Copy marks the row done |
| G9 | Plan and remove a break with the new fee shown first | S | D8 | **Built** | Matches the break tests |
| G10 | Cancel a session: pick a date, see who is affected, copy the announcement | S | D9 | **Built** | Credits granted once |
| G11 | Timetable and special dates; adding or dropping a day asks first | M | D15 | **Built** | Past stays as it was |
| G12 | Settings with short labels, class name, rules, money, Zalo number, messages under Messages | S | C1 | **Built** | Clamps work; class name renames the header |
| G13 | Scores: last scores prefilled, tap only what changed (first in line) | S | C1 | **Built** | Saving adds a dated scoring |
| G14 | Videos: one link per skill | XS | G13 | **Built** | Link shows on the card |
| G15 | My data page: status, Save, Open, Export, earlier copies | S | E4 | **Built** | No paragraphs, one word for saving |
| G16 | Page picture and QR image saved in the file | S | E2 | **Built** | Both survive save and open |
| G17 | Copy reply: one paste after a change with "Done: ..., your new card: link" | M | H3 | **Done** | After recording a request she copies one message and the card counts as sent |

## H. Cards for students

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| H1 | Make a card link that holds only that student's rows | M | P3 | **Built** | No other name in it; link is short enough for chat |
| H2 | Cards to send: banner and list, one Copy message each, list never reorders | S | H1 | **Built** | A change for one student leaves the others current |
| H3 | Send card page: language, Copy message, Preview, one status line | S | H1 | **Built** | Copy marks the card as sent |
| H4 | Card page: one-line header, calendar, old-card banner | S | H1 | **Built** | Draws the same calendar the coach sees for that student |
| H5 | Tap a day: status and the one ask that fits, written for Zalo | M | D11 | **Built** | Extra lesson when there is no credit |
| H6 | Two cards on one phone: the newest wins | S | H4 | **Built** | An old link never replaces a newer card |
| H7 | Skills page: polygon with the change, focus, clip (first in line) | S | H4 | **Built** | No table repeating the numbers |
| H8 | Fees and Pay pages: amount, six month dots, copy amount and code | S | H4 | **Built** | Pay shows only while unpaid |
| H9 | Rules page with the coach's numbers and Ask for a break | XS | H4 | **Built** | Numbers follow her settings |
| H10 | Break row and page, only when a break exists | XS | H4 | **Built** | Row hidden otherwise |
| H11 | Link that did not open: a short screen | XS | H4 | **Built** | Cut-short link shows it |
| H12 | Vietnamese and English texts, kept in step by a test | S | H4 | **Built** | Texts test passes |

## J. Quality

Checks that the prototype tests cannot give.

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| J1 | Run the screen tests in CI with a headless browser | M | D16 | **Done** | Same screen tests pass on every push (`tests/run-screens.js`) |
| J2 | Accessibility pass: contrast in both themes, focus order, names for icon-only controls | M | C2 | **In progress** | Contrast checked by `tests/access.test.js` in both themes (dark muted text fixed); names for icon-only controls tested; focus order and a screen reader still to check by hand |
| J3 | Look at dark mode and the laptop layout with screenshots | S | C2 | **To do** | Both reviewed on every main screen |
| J4 | Walk the whole app on an iPhone, an Android phone and in the Zalo browser | M | C5 | **To do** | A written list of anything that differs |
| J5 | Load check: 60 students and a year of changes; file size and speed | S | E2 | **Done** | `tests/load.test.js`: 138 KB file, saving and opening in milliseconds, busiest card link under 1,000 characters |
| J6 | Vietnamese wording read by a native speaker (the coach) | S | H12 | **To do** | Her corrections are applied |
| J7 | Check the five diagrams in the plan render on GitHub | XS | P7 | **To do** | All render |

## K. Hand-over

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| K1 | Runbook: how to save, open, move to a new phone, what to do if the phone is lost | S | E2 | **To do** | One page she can follow alone |
| K2 | Hand-over checklist and a short agreement (data is hers; code bought or licensed) | S | A4 | **To do** | Both signed or agreed in writing |
| K3 | Instructions for taking her own copy of the site | S | C1 | **To do** | A second Pages address works with her file |
| K4 | Set up her real class together and send the first cards | S | J4 | **To do** | Real students have real cards |
| K5 | Her written sign-off after a week of use | XS | K4 | **To do** | Signed off |

## L. Later (not version 1)

| ID | Ticket | Size | Needs | Status | Done when |
|---|---|---|---|---|---|
| L1 | Google Drive sync for two devices | M | A2 | **Parked** | Only if she needs two devices |
| L2 | A live card page that always shows the latest | M | A2 | **Parked** | Not now (owner); revisit once she has used the cards |
| L3 | PIN lock on the coach page | S |  | **Parked** |  |
| L4 | Automatic reminder emails | M |  | **Parked** |  |
| L5 | QR on the card, made in the browser with amount and code (only if needed) | M |  | **Parked** | Needs her bank and account number; banks allow showing the QR (owner) |
| L6 | Two-pane layout on a laptop | M |  | **Parked** |  |
| L7 | Pages that stack (Pay opens over Fees) | S |  | **Parked** |  |

## Not tickets (decided, so no work)

Student photos, an admin password, student keys, a Google Sheet or Apps Script, a server, accounts for students, receipts upload. See "Decided" in `PLAN.md`.
