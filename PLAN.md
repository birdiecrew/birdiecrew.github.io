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

## How lessons work (this is the core idea)
Students do **not** pick dates one by one. They have a **fixed weekly schedule**, for example Tuesday and Thursday, set by the coach in the Sheet when they join. They are booked on every one of those days, month after month, with no action needed.

The only things a student does on the site:
1. **Skip** one of their regular lessons (for example, going on holiday).
2. **Pick a make-up** lesson on another open session (for example, a weekend), using the credit the skip gave them.

After the make-up day, everything is back to the normal Tuesday and Thursday.

### Skip and make-up, step by step
- A skip gives the student **1 make-up credit**.
- The credit must be used on a session **in the same calendar month as the skipped lesson**. Unused credit expires at the end of that month.
- Skipping without taking a make-up is allowed. The credit just expires.
- The make-up can be on any date in that month (before or after the skipped lesson), as long as it follows the rules below.
- **No notice, no credit.** If a student simply does not show up, or skips inside the lock window, the lesson counts as attended. Nothing is owed.
- All of this is **self-service and instant**. No coach approval. The coach sees every skip and make-up in the Sheet.

### What counts as a "change"
A student may only make a limited number of changes per month, like online booking systems that cap reschedules.
- One **skip** = 1 change.
- **Moving or cancelling a make-up** that was already booked = 1 change.
- **Picking a make-up** with a credit is free (it is part of the skip).
- Limit: **3 changes per calendar month** (configurable).

## What a student sees (one card, mostly pictures)
1. **Calendar:** shows the month. Regular days are solid, skipped days are crossed out, make-up days are highlighted, and open sessions with free seats are green. Days inside the lock window are grey. Tap a regular day to skip it. Tap a green day to take a make-up.
2. **Polygon:** 6 skills (Smash, Net, Footwork, Defense, Serve, Stamina), each scored 1 to 10 by the coach. Last month's polygon shows as a faint outline, so growth is visible.
3. **Video:** the clip for their weakest skill, from a YouTube or TikTok link the coach pastes into the Sheet.
4. **Bills:** a row of month dots, filled once paid. Underneath, a "Pay now" button with the QR and their code. If the student is late, a clear banner says so.

Language toggle (Vietnamese / English) on every screen. Some students are English speakers.

## Rules
All numbers below are **settings in a Config tab of the Sheet**, so the coach can change them without touching code. Defaults are shown.

| Rule | Default | Setting name |
|---|---|---|
| Skip or book a make-up at least this many **calendar days** before the lesson (weekends count) | 7 | `advance_days` |
| Monthly fee is paid by the end of this day of the month | 5 | `pay_by_day` |
| Changes allowed per student per month | 3 | `max_changes_per_month` |
| Players per court | 4 | `seats_per_court` |

**Payment (flat monthly fee, paid like rent):**
- One fixed fee per month, set by the coach. Paid by bank transfer, with the student's code in the note.
- Paid **by the end of the 5th** is on time. Late starts on the 6th. Paying late unlocks it again.
- The coach marks the month as paid in the Payments tab after checking the bank app. No receipt upload.

**When a student is late (from the 6th until they pay):**
- The calendar greys out: they cannot skip, move or pick a make-up.
- Their regular weekly lessons and any make-ups already booked **stay**. The coach decides case by case.
- The student sees a banner with the Pay now button.
- The coach sees the student marked "unpaid" in the Sheet (red row).
- Days 1 to 5 are a grace period: nothing is locked yet.

**The 7-day lock:**
- A lesson can be skipped, or a make-up booked or moved, only if the lesson date is at least `advance_days` calendar days after today.
- Example with the default of 7 days: today is 10 Nov. A lesson on 17 Nov can still be changed. A lesson on 16 Nov is locked.
- The same rule applies to the make-up date a student is choosing.

**Seats:**
- Each session has a number of **courts**, set by the coach (usually 2 or 3).
- Normal seats = courts x `seats_per_court`. Four per court, because anyone beyond that waits on the side.
- The coach can type **extra seats** (0, 1 or 2) on a session to allow a squeeze-in. Students can only book up to normal seats plus the coach's extra seats.
- Regular students are never bumped, even if the coach adds someone and the session goes over. The session just shows as full for make-ups.
- A student skipping frees their seat for someone else's make-up.

## Where the data lives (tabs in the private Sheet)
| Tab | What it holds |
|---|---|
| Config | The settings above, plus the monthly fee, bank QR image link and default language. |
| Students | Code, display name (first name or nickname is enough), weekly days (e.g. `Tue,Thu`), start date, active yes/no. |
| Sessions | One row per lesson date: date, start and end time, courts, extra seats, cancelled yes/no. The coach fills a month at a time. |
| Changes | One row per skip or make-up: student code, type (`skip` or `makeup`), session date, linked skip, created time, cancelled time. |
| Scores | Student code, month, and the 6 skill scores. |
| Payments | Student code, month, paid date. The coach types a row when money arrives. |
| Videos | Skill, link (YouTube or TikTok). |

**Who is in a session:** every active student whose weekly days include that weekday and whose start date has passed, minus those with a `skip` for that date, plus those with a `makeup` for that date.

## Privacy and safety
- The repo is **public** (free Pages needs it). No student data, names or codes are ever committed to it.
- Codes are long and random (not guessable like `001`). The script blocks a device after several wrong tries.
- The code is sent to the script in the request body, never in the page address.
- A student gets only their own data. Seat counts show **numbers only**, never other students' names.
- Booking runs under a script lock, so two students cannot take the last seat at the same moment.
- Dates use one fixed time zone, set in the script and in Config (see "Still open").

## Build order
1. **Student card with fake data.** Polygon, bills, calendar (read-only), language toggle. *Done when it looks right on a phone.*
2. **Sheet and script, read-only.** Create the tabs, a script that returns one student's card by code. Test with 50 students and 3 months of sessions, and check the speed. *Done when the page shows real Sheet data and a wrong code shows nothing.*
3. **Skip and make-up with all the rules.** Seat count, 7-day lock, credit, monthly change limit, and the unpaid lock. *Done when every example in the test list below passes.*
4. **Pay now page.** QR, code in the note, and the late banner.
5. **Videos.**

## Test list for step 3
Assume `advance_days` = 7, `max_changes_per_month` = 3, `pay_by_day` = 5, and the student has paid.
- Skip a lesson 8 days away: allowed, 1 credit.
- Skip a lesson 7 days away: allowed. 6 days away: refused (locked).
- Use the credit on an open session 10 days away in the same month: allowed. Next month: refused.
- Use a second credit when only one skip was made: refused.
- Pick a make-up on a full session: refused. After the coach sets extra seats to 1: allowed.
- Three skips in a month: allowed. The fourth change: refused.
- Move a booked make-up: counts as 1 change.
- Skip inside the lock window by editing the page or the request: the script refuses.
- Today is the 5th and the month is not paid: still allowed. Today is the 6th and not paid: refused.
- Coach marks the month paid on the 12th: the same student can skip again immediately.
- Two students book the last seat at the same time: exactly one succeeds.
- A wrong code returns nothing and counts toward the block.

## Still open
These do not block steps 1 and 2. Current guess in brackets.
- **Time zone and currency** for dates and the fee. (Coach's local time zone, Vietnamese dong. Confirm before step 3.)
- **A student who joins mid-month:** is the first month prorated? (The coach handles it by hand and just marks the month paid.)
- **Reminders:** should the script email or message students before the 5th? (Not in the first version. The banner and the red row in the Sheet are enough.)
- **Does a coach-cancelled session** (rain, holiday) give students a credit? (Yes, a free credit with no change counted. Confirm before step 3.)
- **Google script speed and limits.** A class of 10 to 50 students should be fine; step 2 checks it.

## Decided
- Flat monthly fee, paid by the end of the 5th (setting). (Was "1st to 3rd" in the first draft.)
- Fixed weekly schedule per student. Skip plus same-month make-up, self-service, instant.
- A skip without notice (inside the lock window or no-show) gets no credit.
- 7 calendar days notice, weekends included, as a setting. Max 3 changes a month, as a setting.
- Group classes. 4 per court, coach-set courts, coach-set extra seats 0 to 2.
- Existing bookings stay when a student is late. Only new changes are locked.
- Both languages (Vietnamese and English), with a toggle.
- No receipt upload. The sheet stays private.

## Status so far (2026-11-04)
Done:
- Name chosen: **Birdie Crew**, at `birdiecrew.github.io`.
- GitHub account `birdiecrew` and repo `birdiecrew/birdiecrew.github.io` created. The repo is **public**. No student data lives in the repo; it stays in the private Google Sheet.
- `main` is protected: changes go through a pull request, and force pushes are blocked.
- PR #1 merged. GitHub Pages is on for `main` and the build status is "built". The placeholder page is live.
- Git push from this computer works over SSH.
- Plan refined into this version (this PR).

Next:
1. Merge this plan PR.
2. Build step 1, the student card with fake data.
3. Answer "Still open" before step 3.

Working notes:
- Commits use `birdiecrew <lewisozera@gmail.com>`.
- This repo pushes with its own SSH key, set in the local git config (not stored in the repo), so it does not use the key of any other GitHub account on the same computer.
