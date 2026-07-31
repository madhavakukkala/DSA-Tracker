# DSA Tracker

A 32-week DSA + development study tracker with built-in spaced repetition
(day-2 / day-5 / day-10 revision), following Striver's A2Z sheet in the mornings
and Namaste React/Node in the evenings. Vanilla HTML/CSS/JS, no framework, no
build step, no dependencies, no account. All data lives in **your** browser's
`localStorage` — nothing is uploaded anywhere.

## Use it

Open the app (hosted, or just double-click `index.html` — it works over `file://`
and over http alike). On first launch it asks for **your start date**; the entire
32-week roadmap, every weekly plan and every revision date is anchored to it.
Weeks run Monday–Sunday, so the date snaps to a Monday. You can change it later
on the Data screen.

Then, daily:

1. **Morning 6:30** — open **Today**, clear the revision queue (say the approach
   out loud *before* pressing Reveal), then follow the Learn / Practise blocks.
2. **9:20** — press `n` and log every problem you solved. This builds the queue.
3. **Night 9:00** — the Night panel has your dev task; tick episodes in Courses
   as you *build* them.
4. **Weekly** — Data → Download backup JSON. Browser storage is one careless
   "clear browsing data" away from gone.

Because everything is per-browser, use the same browser on the same device —
or move between devices with export/import.

(Classic `<script defer>` tags are used instead of ES modules, because browsers
block module imports on `file://` URLs.)

## Screens

`#/today` (home) · `#/problems` · `#/roadmap` · `#/progress` · `#/courses` ·
`#/applications` · `#/data` · `#/help`

Keyboard: `n` log a problem · `/` search problems · `1`–`7` switch screens · `Esc` close.

## Back up your data

**Data → Download backup JSON**, weekly at minimum. Browser storage is one careless
"clear browsing data" away from gone. The Today screen nags when the last backup is
over 7 days old; listen to it.

## Deploy your own

It's a static site — any static host works with zero configuration:

- **Vercel**: import the repo, framework preset "Other", no build command,
  output directory = repo root. Deploy.
- **GitHub Pages**: Settings → Pages → deploy from branch `main`, root folder.

## Development

```
tests/revision.test.js       acceptance tests for the revision engine (§10 of the spec)
    node tests/revision.test.js

tools/extract-curriculum.js  regenerates src/data/curriculum.json/.js from dsa-dev-roadmap.html
    node tools/extract-curriculum.js
```

`src/data/*.js` files are generated mirrors of the committed `*.json` (a classic-script
global is the only way to load local data on `file://`, where `fetch()` is blocked).
`striver.json` and `courses.json` were extracted once from the workbook's Striver
Checklist and Course Checklist sheets.

Layout:

```
index.html
src/
  main.js          router, nav, keyboard shortcuts
  store.js         localStorage, schema versioning, export/import
  revision.js      spaced-repetition engine — pure functions, no DOM
  components/      helpers.js  modal.js  dayStrip.js  problemForm.js
  views/           today.js  problems.js  roadmap.js  progress.js
                   courses.js  applications.js  data.js  help.js
  data/            curriculum(.json/.js)  striver(.json/.js)  courses(.json/.js)
styles/
  tokens.css  base.css  components.css
tools/             extract-curriculum.js
tests/             revision.test.js
```
