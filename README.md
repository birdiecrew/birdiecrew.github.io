# Birdie Crew

A free badminton class: a coach page for the coach, and a read-only card for each student. No server, no accounts. It is plain HTML, CSS and JavaScript on GitHub Pages.

| Page | Address | Who |
|---|---|---|
| Card | https://birdiecrew.github.io/ | A student, from the link the coach sends. The card is inside the link (`#c=…`) and never leaves the phone. |
| Coach | https://birdiecrew.github.io/admin/ | The coach. Her data is a save file she keeps, plus an automatic working copy in her browser. |

Vietnamese is the default on both pages. English is one button away. The plan is in [PLAN.md](PLAN.md) and the work is split into small tickets in [TICKETS.md](TICKETS.md).

## Try it (smoke test)

Do this once on a computer and once on a phone.

**Coach page** (`/admin/`)
1. Open it. Choose **Sample class** (made-up students, fixed sample date). The home screen shows the next 14 days.
2. Open a student, then their calendar. Tap a day, choose skip or make-up, confirm. A message with a **Copy reply** button appears.
3. Open **Skills**, score a student, and check the polygon moves.
4. Open **More → My data**. **Save file** downloads a `.json` file. **Open file** loads it back. **Support copy** copies a short text with no names.
5. Change something, and the save icon turns on. Save again and it goes quiet.
6. **Start over** returns to the first-run wizard. Walk through it with your own test name: class days, fees, first student.
7. Add `?today=2026-12-01` to the address to pretend it is another day. A banner says so, and **nothing is saved** while you pretend: edits stay in memory, Save file refuses, and a reload forgets them. Your real class is safe.

**Card page** (`/`)
1. Opened with no link it says "No card yet".
2. On the coach page, open a student and **Send card**. The message holds a link. Open that link in another tab or on another phone.
3. The card shows only that student: next lessons, credits, fees, skills. The **EN** button switches language. A skill video opens its link.
4. Change something on the coach page and send again. Opening the older link shows an out-of-date banner.

**Home Screen** (phone): in Safari **Share → Add to Home Screen**, in Chrome **⋮ → Install app**, on the coach page.

## Run the tests

```bash
node tests/run-all.js
```

Rules, money, cards, storage, texts, a student's days history, the year end, file validation, the built-in decompressor, load, contrast and site files. A few minutes.

```bash
npm install --no-save playwright && npx playwright install chromium
node tests/run-screens.js
```

Every screen and the security policy in a real browser. If Chrome is already installed, `PW_CHANNEL=chrome node tests/run-screens.js` skips the download. `PW_BROWSER=webkit` (Safari's engine) or `PW_BROWSER=firefox` runs the same tests in those engines; CI does both. Or serve the folder (`python3 -m http.server`) and open `/tests/ui-tests.html` and `/tests/csp-check.html`.

GitHub Actions runs all of this on every push (`.github/workflows/tests.yml`): the node tests, the screens in Chromium, Firefox and WebKit, and the site files.

`?today=…&save=1` is for the tests only: it lets a pretend day write. Do not use it on a real class.

## Folder map

```
index.html            the card page
admin/index.html      the coach page (+ manifest.webmanifest for the Home Screen)
assets/core.js        the rules: credits, cap, make-ups, timetable, fees
assets/store.js       save file, working copy, cards, links, report
assets/sample.js      the made-up sample class
assets/admin*.js, student*.js, ui.js, *.css   screens and texts (Vietnamese and English)
tests/                node tests, browser tests, the runner
```

## Security in one paragraph

A policy in each page blocks every network call (`connect-src 'none'`), inline scripts and outside files. The pages are marked noindex with no referrer. The only thing that leaves is a link the coach sends herself, and the only outside page the code opens is Zalo. Student data is never committed to this public repo.

## Known limits (need a real phone)

Not provable from a computer: the share sheet for Save file on iPhone and Android, a card link inside the Zalo in-app browser, how long the working copy survives in a phone browser (tickets B1 to B8), and iPhone Safari with the security policy (WebKit in CI is the closest check).

The site has no offline mode yet: once a page is open it keeps working, but opening it with no network fails. The coach's answers to the open questions are recorded in the plan and confirmed in ticket A1.
