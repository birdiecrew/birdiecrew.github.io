# Birdie Crew: badminton coaching site

Site address: `birdiecrew.github.io` (GitHub Pages, free).

## The idea in one line
A free website where each student opens **their own card** (schedule, skill polygon, bills, videos), and the coach runs everything from **one private Google Sheet**.

## What we copied from Project Snowball
Snowball has no payment company. People scan a QR code, put a short code in the transfer note, and the owner checks the bank app, then types the code into a Google Sheet. We reuse this as is: no accounts, no passwords, no card fees.

One difference: Snowball's list of codes is public. Student scores are personal, and some students may be kids, so here the Sheet stays **private**. A small Google script hands each student only their own data.

## How it works
- **Website:** plain static pages on GitHub Pages. No server.
- **Brain:** a private Google Sheet in the same new account, plus a Google Apps Script web app that is the only thing that reads or writes it.
- **Login:** each student gets a personal code. They open the site once and the browser remembers it. The code works like a password, so students keep it private.
- **Coach admin screen:** the Sheet itself. Nothing extra to build.
- **The script is the referee.** The page only displays things. Every rule below is checked again inside the script, so a student cannot get around a rule by editing the page.

## The class rules (from the coach's own notice)
These are the real rules of the class. The site must follow them, and every number is a setting the coach can change.

1. **Fee:** paid at the start of each month, **deadline the 5th**.
2. **Timetable:** Monday to Thursday **20:00 to 22:00**. Saturday and Sunday **10:00 to 12:00**. No class on Friday.
3. **Flexible members:** students without a fixed schedule send their planned schedule **the week before**, so the coach can arrange the class and time slots.
4. **Breaks:** for a planned break (for example 2 weeks to 1 month), tell the coach **in advance**, so the coach can arrange the class and **adjust the fee**.
5. **Make-up lessons:** because the class is big, at most **3 make-up lessons per month per person**.
6. **Sudden absence:** if a student reports an absence at the last minute, **no make-up** is arranged.

## How lessons work

### The timetable
The weekly timetable lives in a Timetable tab (weekday, start, end, courts), so nobody has to create lessons one by one. The Sheet only needs a row when something is special: a cancelled day, extra courts, or extra seats (the "Session overrides" tab).

### Two kinds of student
- **Fixed schedule** (most students). The coach sets their days (for example Tuesday and Thursday). They are booked every week with no action. Their only actions: **skip** a lesson, and **pick a make-up**.
- **Flexible schedule.** No fixed days. They pick the sessions they plan to attend, at least `flex_notice_days` before each one. This is the site version of "send me your plan the week before". Seats apply. They have no make-up credits, because there is no fixed lesson to make up.

### Skip and make-up (fixed students), step by step
- Telling the coach **in advance** (at least `advance_days` before the lesson) lets a student skip. A skip earns **1 make-up credit**.
- A student can earn and use at most **`max_makeups_per_month` make-ups per calendar month** (default 3). A skip beyond that is still allowed, but earns no credit.
- The credit must be used on a session **in the same calendar month as the skipped lesson**. Unused credit expires at the end of that month.
- The make-up can be on any open session that month (before or after the skipped lesson), as long as it follows the rules below.
- **Sudden absence = no make-up.** If a student does not show up, or tries to skip inside the notice window, the lesson counts as attended and nothing is owed. The site locks the button, so the coach never has to argue about it.
- All of this is **self-service and instant**. No coach approval. The coach sees every skip and make-up in the Sheet.
- **Moving or cancelling a make-up** that is already booked is limited to `max_makeup_changes_per_month` per month (default 3, set to 0 for no limit). Online booking systems do the same, so people do not keep changing dates.

### Planned breaks
- A student can plan a break from the card: pick the from and to dates, at least `advance_days` before the first day.
- A break of **`long_break_days` or more** (default 14) is a **long break**. During it the student is not on any session, and no make-up credits are earned. The coach sees it in a Breaks tab and **types the fee adjustment** there. The student's Pay now screen shows the adjusted amount once the coach has filled it in.
- A shorter break is not a long break. Each skipped lesson is a normal skip (with the make-up cap above).

## What a student sees (one card, mostly pictures)
1. **Calendar:** shows the month. Regular days are solid, skipped days are crossed out, make-up days are highlighted, and open sessions with free seats are green. Days inside the lock window are grey. Fixed students tap a regular day to skip it, and a green day to take a make-up. Flexible students tap a session to join or leave it. A counter says "make-ups left this month: 2 of 3".
2. **Polygon:** 6 skills (Smash, Net, Footwork, Defense, Serve, Stamina), each scored 1 to 10 by the coach. Last month's polygon shows as a faint outline, so growth is visible.
3. **Video:** the clip for their weakest skill, from a YouTube or TikTok link the coach pastes into the Sheet.
4. **Bills:** a row of month dots, filled once paid. Underneath, a "Pay now" button with the QR and their code. If the student is late, a clear banner says so.
5. **Plan a break:** a small form (from, to).
6. **Class rules:** one screen that shows the six rules above. Its numbers are read from Config, so the page and the coach's real settings never disagree.

Language toggle (Vietnamese / English) on every screen. **Vietnamese is the default**, because the class notice is in Vietnamese. Some students are English speakers.

## Rules and settings
All numbers below are **settings in a Config tab of the Sheet**, so the coach can change them without touching code. Defaults are shown.

| Rule | Default | Setting name |
|---|---|---|
| Skip, take a make-up, or start a break at least this many **calendar days** before the lesson (weekends count) | 7 | `advance_days` |
| Flexible students join a session at least this many days before it | 7 | `flex_notice_days` |
| Monthly fee is paid by the end of this day of the month | 5 | `pay_by_day` |
| Make-ups per student per month | 3 | `max_makeups_per_month` |
| Moves or cancels of a booked make-up per month (0 = no limit) | 3 | `max_makeup_changes_per_month` |
| A break this many days or longer is a long break | 14 | `long_break_days` |
| Players per court | 4 | `seats_per_court` |
| Courts per session when the timetable does not say | 2 | `default_courts` |
| Courts the venue has. No session can have more | 4 | `venue_courts` |

**Payment (flat monthly fee, paid like rent):**
- One fixed fee per month, set by the coach. A student can have their own fee in the Students tab. Paid by bank transfer, with the student's code in the note.
- Paid **by the end of the 5th** is on time. Late starts on the 6th. Paying late unlocks it again.
- The coach marks the month as paid in the Payments tab after checking the bank app. No receipt upload.

**When a student is late (from the 6th until they pay):**
- The calendar greys out: they cannot skip, join, move, take a make-up, or plan a break.
- Their regular weekly lessons and any make-ups already booked **stay**. The coach decides case by case.
- The student sees a banner with the Pay now button.
- The coach sees the student marked "unpaid" in the Sheet (red row).
- Days 1 to 5 are a grace period: nothing is locked yet.

**The notice lock:**
- A lesson can be skipped, or a make-up booked or moved, only if the lesson date is at least `advance_days` calendar days after today.
- Example with the default of 7 days: today is 10 Nov. A lesson on 17 Nov can still be changed. A lesson on 16 Nov is locked.
- The same rule applies to the make-up date a student is choosing.

**Seats:**
- Each session has a number of **courts**: from the timetable, or the override. The venue has only **4 courts** (`venue_courts`), so a session can never have more than 4. The script refuses a higher number.
- Normal seats = courts x `seats_per_court`. Four per court, because anyone beyond that waits on the side. The most a session can ever hold is 4 courts x 4 = **16 seats**, plus up to 2 extra.
- The coach can type **extra seats** (0, 1 or 2) on a session to allow a squeeze-in. Students can only book up to normal seats plus the coach's extra seats.
- Regular students are never bumped, even if the coach adds someone and the session goes over. The session just shows as full for make-ups and flexible joins.
- A student skipping or on a break frees their seat for someone else.

## Where the data lives: the Google Sheet is the database
There is **no other database**. The private Google Sheet is it. This is enough because the class is small: about 100 students at most, in a venue with 4 courts.

**Why a Sheet is enough**
- 100 students make roughly 100 payment rows a month and a few hundred skip or make-up rows a month. That is a few thousand rows a year. A Sheet holds millions of cells, and we would use well under 1%.
- The script reads a whole tab in one call (a few hundred to a few thousand rows is fast), finds the student's rows by code, and answers. No search index needed.
- At most 16 seats per session (4 courts x 4), so two students fighting for a seat is rare. The script lock handles it anyway.
- The coach already knows how to use a Sheet, so there is nothing new to learn and no server bill.

**Who writes what**
- **The coach** types into: Config, Timetable, Session overrides, Students, Payments, Breaks (fee adjustment), Scores, Videos.
- **The script** writes only to the Changes tab (skips, make-ups, joins, leaves) and the Breaks rows a student plans. The Changes tab is protected, with a warning "written by the site, do not edit by hand".
- Dates and times are stored as real dates, never as text, so sorting and filtering work.

**Keeping it safe and tidy**
- **Backup:** Google keeps the Sheet's version history. Once a month, the coach makes a copy of the Sheet (File, Make a copy). Later this can be a small scheduled script.
- **Growth:** once a year, move old Changes, Payments and Scores rows to an "Archive 20XX" tab or file, so the live tabs stay small.
- **Speed:** the script keeps Config and Timetable in a short cache, because they change rarely. Step 2 measures the real speed with 100 test students.
- **Moving later:** if the class ever grows past a few hundred students, the same tabs can become database tables. The page and the rules do not change.

**The tabs**

| Tab | What it holds |
|---|---|
| Config | The settings above, plus the default monthly fee, bank QR image link and default language. |
| Timetable | One row per class weekday: weekday, start, end, courts. Starts as Monday to Thursday 20:00 to 22:00, Saturday and Sunday 10:00 to 12:00. |
| Session overrides | Only for special dates: date, courts, extra seats, cancelled yes/no, note. |
| Students | Code, display name (first name or nickname is enough), type (`fixed` or `flexible`), weekly days (e.g. `Tue,Thu`, empty for flexible), start date, own monthly fee (optional), active yes/no. |
| Changes | One row per action: student code, type (`skip`, `makeup`, `join` or `leave`), session date, linked skip, created time, cancelled time. |
| Breaks | Student code, from, to, date notified, **fee adjustment (typed by the coach)**, note. |
| Scores | Student code, month, and the 6 skill scores. |
| Payments | Student code, month, amount, paid date. The coach types a row when money arrives. |
| Videos | Skill, link (YouTube or TikTok). |

**Who is in a session:** every active fixed student whose weekly days include that weekday, whose start date has passed, who is not on a break, minus those with a `skip` for that date, plus those with a `makeup` or `join` for that date.

## Privacy and safety
- The repo is **public** (free Pages needs it). No student data, names or codes are ever committed to it.
- Codes are long and random (not guessable like `001`). The script blocks a device after several wrong tries.
- The code is sent to the script in the request body, never in the page address.
- A student gets only their own data. Seat counts show **numbers only**, never other students' names.
- Booking runs under a script lock, so two students cannot take the last seat at the same moment.
- Dates use one fixed time zone, set in the script and in Config (see "Still open").

## Build order
1. **Student card with fake data.** Polygon, bills, calendar (read-only), language toggle (Vietnamese first), class rules screen. *Done when it looks right on a phone.*
2. **Sheet and script, read-only.** Create the tabs, a script that returns one student's card by code. Test with 100 fake students and 3 months of rows, and check the speed. *Done when the page shows real Sheet data and a wrong code shows nothing.*
3. **Skip and make-up with all the rules.** Seat count, notice lock, credit, the 3-make-up cap, and the unpaid lock. *Done when every example in the test list below passes.*
4. **Flexible students and planned breaks.** Join or leave sessions, the break form, the Breaks tab.
5. **Pay now page.** QR, code in the note, the late banner, and the adjusted amount after a long break.
6. **Videos.**

## Test list for step 3
Assume `advance_days` = 7, `max_makeups_per_month` = 3, `pay_by_day` = 5, and the student has paid.
- Skip a lesson 8 days away: allowed, 1 credit.
- Skip a lesson 7 days away: allowed. 6 days away: refused (locked), and the lesson counts as attended.
- Use the credit on an open session 10 days away in the same month: allowed. Next month: refused.
- Use a second credit when only one skip was made: refused.
- Four skips in a month, all with notice: all four allowed, but only the first three give a credit. The fourth gives none.
- Three make-ups taken: a fourth make-up is refused even if a credit is somehow left.
- Pick a make-up on a full session: refused. After the coach sets extra seats to 1: allowed.
- The coach sets 5 courts on a session: the script refuses (the venue has 4). With 4 courts, the session holds 16 seats.
- Move a booked make-up: counts toward `max_makeup_changes_per_month`. The fourth move: refused.
- Skip inside the lock window by editing the page or the request: the script refuses.
- Today is the 5th and the month is not paid: still allowed. Today is the 6th and not paid: refused.
- Coach marks the month paid on the 12th: the same student can skip again immediately.
- Two students book the last seat at the same time: exactly one succeeds.
- A wrong code returns nothing and counts toward the block.

## Test list for step 4
- A flexible student joins a session 7 days away: allowed. 6 days away: refused.
- A flexible student leaves a session: no credit is given.
- A 14-day break starting 7 days from now: accepted, and the sessions in it show as "on break" with no credits earned.
- A 10-day break: treated as normal skips, with the make-up cap.
- A break starting 3 days from now: refused.
- The coach types a fee adjustment: Pay now shows the new amount. Without one, it shows the normal fee.

## Still open
These do not block steps 1 and 2. Current guess in brackets.
- **Time zone and currency** for dates and the fee. (Coach's local time zone, Vietnamese dong. Confirm before step 3.)
- **How a long break changes the fee.** The notice says the coach will "help adjust" it. (The coach types the amount by hand in the Breaks tab. No formula in the site.)
- **Flexible students:** is the rule "each session at least 7 days ahead", or "the whole week's plan sent during the week before"? And do they pay the same fee? (Each session at least 7 days ahead, and a fee set per student.)
- **A student who joins mid-month:** is the first month prorated? (The coach handles it by hand and just marks the month paid.)
- **Reminders:** should the script email or message students before the 5th? (Not in the first version. The banner and the red row in the Sheet are enough.)
- **Does a coach-cancelled session** (rain, holiday) give students a credit? (Yes, a free credit that does not count toward the 3-make-up cap. Confirm before step 3.)
- **Name:** the class notice is branded "VM Badminton", while the site is "Birdie Crew". (Keep Birdie Crew. Say so if the name changes.)
- **Google script speed and limits.** A class of up to about 100 students should be fine; step 2 checks it.

## Decided
- Class timetable: Monday to Thursday 20:00 to 22:00, Saturday and Sunday 10:00 to 12:00, kept in a Timetable tab.
- Flat monthly fee, paid by the end of the 5th (setting).
- Fixed weekly schedule per student, or flexible students who pick sessions in advance.
- Skip with notice earns a make-up credit, used in the same month. Self-service, instant.
- At most 3 make-ups per student per month (setting). More skips are allowed but give no credit.
- Sudden absence, or a skip inside the notice window, gets no make-up.
- Planned breaks need notice. A break of 14 days or more is a long break, and the coach adjusts the fee by hand.
- 7 calendar days notice, weekends included, as a setting.
- The private Google Sheet is the only database. Up to about 100 students.
- The venue has 4 courts. A session has at most 4 courts, so at most 16 seats plus 0 to 2 extra.
- Group classes. 4 per court, courts from the timetable, coach-set extra seats 0 to 2.
- Existing bookings stay when a student is late. Only new changes are locked.
- Both languages (Vietnamese by default, and English), with a toggle.
- No receipt upload. The sheet stays private.

## Status so far (2026-11-05)
Done:
- Name chosen: **Birdie Crew**, at `birdiecrew.github.io`.
- GitHub account `birdiecrew` and repo `birdiecrew/birdiecrew.github.io` created. The repo is **public**. No student data lives in the repo; it stays in the private Google Sheet.
- `main` is protected: changes go through a pull request, and force pushes are blocked.
- PR #1 merged. GitHub Pages is on for `main` and the build status is "built". The placeholder page is live.
- PR #2 merged: the plan became a build-ready spec.
- The class's real notice is applied to the plan (this change).
- Git push from this computer works over SSH.

Next:
1. Merge the class-rules PR.
2. Build step 1, the student card with fake data.
3. Answer "Still open" before step 3.

Working notes:
- Commits use `birdiecrew <lewisozera@gmail.com>`.
- This repo pushes with its own SSH key, set in the local git config (not stored in the repo), so it does not use the key of any other GitHub account on the same computer.
- `gh` may be signed in as another account. For this repo, run it with `GH_TOKEN="$(gh auth token --user birdiecrew)"`.
