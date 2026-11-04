# Birdie Crew: badminton coaching site

Site address: `birdiecrew.github.io` (GitHub Pages, free).

## The idea in one line
A free website where each student opens **their own card** (calendar, skill polygon, bills, videos), and the coach runs everything from **one private Google Sheet**.

## What we copied from Project Snowball
Snowball has no payment company. People scan a QR code, put a short code in the transfer note, and the owner checks the bank app, then types the code into a Google Sheet. We reuse this as is: no accounts, no passwords, no card fees.

One difference: Snowball's list of codes is public. Student scores are personal, and some students may be kids, so here the Sheet stays **private**. A small Google script hands each student only their own data.

## How it works
- **Website:** plain static pages on GitHub Pages. No server.
- **Brain:** a private Google Sheet in the same new account, with tabs for Students, Open slots, Bookings, Scores, Payments and Videos.
- **Login:** each student gets a personal code. They open the site once and the browser remembers it. The code works like a password, so students keep it private.
- **Coach admin screen:** the Sheet itself. Nothing extra to build.

## What a student sees (one card, mostly pictures)
1. **Calendar:** green days are open. Tap one to book it, tap again to change it.
2. **Polygon:** 6 skills (Smash, Net, Footwork, Defense, Serve, Stamina), each scored 1 to 10 by the coach. Last month's polygon shows as a faint outline, so growth is visible.
3. **Video:** the clip for their weakest skill, from a YouTube or TikTok link the coach pastes into the Sheet.
4. **Bills:** a row of month dots, filled once paid. Underneath, a "Pay now" button with the QR and their code.

## Rules (so nobody has to think)
- **Pay on the 1st to 3rd, coached that same month.** Like rent. (Confirmed.)
- **Not paid by the 3rd:** the calendar greys out on the 4th. Paying late unlocks it again.
- **Book or change a date at least 7 days before it.** Inside 7 days, the date is locked.
- **Each slot has a seat limit,** so it cannot be double-booked.
- **No receipt upload.** The coach already sees the transfer in the bank app.

## Build order
1. Student card with the polygon and bills, using fake data. *Done when it looks right on a phone.*
2. Calendar and booking with the rules above.
3. Payment page and the paid / locked logic.
4. Videos.

## Still open (current guess in brackets)
- Is "one week in advance" **at least 7 days before** the lesson, or **only up to 7 days ahead**? (At least 7 days before.)
- **Group classes** with several students per slot, or one-on-one? (Group, with a seat limit.)
- Language: Vietnamese, English, or both? (Both, with a toggle, like Snowball.)

## Not verified yet
- The speed and limits of the Google script. A class of 10 to 50 students should be fine; check before step 2.
