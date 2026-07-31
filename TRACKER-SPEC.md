# DSA Tracker — Build Specification

A local-first web app that replaces the `dsa-tracker.xlsx` spreadsheet. Same logic, same data,
no spreadsheet. Runs entirely in the browser with `localStorage` as the database.

**Owner context:** one user, studying DSA 6:30–9:30am and development 9pm–12am, for 32 weeks
from Mon 3 Aug 2026 to Sun 14 Mar 2027. The app is opened twice a day, every day, for eight
months. Optimise for *fast daily use*, not for features.

---

## 1. Input files

Both are in this repo. **Read them before writing any code.**

| File | What to take from it |
|---|---|
| `dsa-dev-roadmap.html` | The `PHASES` and `W` arrays inside the second `<script>` block. This is the complete 32-week curriculum: 224 days, each with a learn block, a practise block and an evening task. **Extract it, do not rewrite it.** Also take the CSS custom properties from `:root` — they are the design system. |
| `dsa-tracker.xlsx` | Reference only, to confirm field names and the sheet-to-screen mapping in §7. You do not need to parse it. |

### Extracting the curriculum

The `W` array has 32 objects shaped like:

```js
{ n: 13,                          // week number, 1–32
  ph: 4,                          // phase number, 1–8
  dates: "26 Oct – 1 Nov 2026",
  step: "Striver Step 8 + number theory",
  dsa:  "Bit manipulation + number theory",   // morning track title
  dev:  "Namaste React — NetflixGPT (Ep 14-16)", // evening track title
  goal: "A short, high-yield week…",
  d: [ [learn, practise, evening], … ],  // exactly 6 entries, Mon–Sat
  sun: [ morningConsolidation, eveningTask ] }
```

Write a one-off Node script that reads the HTML, evaluates that script block, and writes
`src/data/curriculum.json`. Commit the JSON. Do not parse HTML at runtime.

**Verify after extraction:** 32 weeks, 8 phases (4 weeks each), 192 weekday entries each with
exactly 3 non-empty strings, 32 Sunday entries each with exactly 2. Total 224 days.

---

## 2. Tech

- **Vanilla HTML + CSS + JavaScript (ES modules). No framework, no build step.**
- No dependencies. No npm install required to run.
- Must work by opening `index.html` directly (`file://`) *and* when served over http.
- Fonts from Google Fonts CDN, with a system-font fallback stack so it still works offline.

**Why vanilla:** the user is learning JavaScript in weeks 5–8 and React in weeks 9–14. They must
be able to read and repair this app themselves by September. A build step they don't understand
is a single point of failure on a tool they depend on daily. Do not introduce React, Vue,
TypeScript, Tailwind, Vite or a bundler.

> Note for later: rebuilding this app in React around week 12 is an excellent first React
> project, because the domain is already understood. That is a future exercise, not this build.

Suggested layout:

```
index.html
src/
  main.js          entry, router, nav
  store.js         localStorage read/write, schema versioning, export/import
  revision.js      spaced-repetition logic (pure functions, no DOM)
  views/           today.js  problems.js  roadmap.js  progress.js
                   courses.js  applications.js  data.js  help.js
  components/      statCard.js  table.js  modal.js  dayStrip.js
  data/            curriculum.json  striver.json  courses.json
styles/
  tokens.css  base.css  components.css
```

---

## 3. Data model

All dates are **`YYYY-MM-DD` strings**, never `Date` objects and never ISO timestamps.
String comparison then equals date comparison, and there are no timezone bugs. Compute
"today" once per page load with a local-time helper, not `toISOString()` (which is UTC and
will be wrong before 5:30am IST).

```js
Problem {
  id, dateSolved, week, topic, striverStep, name, difficulty, link,
  solvedHow,        // 'alone' | 'hint' | 'editorial'
  minutes, approach, complexity,
  r1, r2, r3,       // booleans
  confidence,       // 1–5
  notes
}

DailyLog   { date, morningHrs, eveningHrs, newProblems, revisionsCleared, energy, wentWrong, fixTomorrow }
Application{ id, dateApplied, company, role, source, status, lastContact, nextAction, notes }
WeekState  { week, status }            // 'not-started' | 'in-progress' | 'done'
CourseItem { id, course, section, episode, plannedWeek, watched, built }
StriverItem{ id, step, section, subStep, problemCount, plannedWeek, started, cleared }
```

Root object in `localStorage` under key `dsa-tracker-v1`:

```js
{ schemaVersion: 1, startDate: "2026-08-03",
  problems: [], dailyLogs: [], applications: [],
  weeks: {}, courses: {}, striver: {}, lastBackup: null }
```

Write on every mutation, debounced 300ms. Read once on load into memory. Never read
`localStorage` inside a render loop.

### Seed data

- `curriculum.json` — from §1.
- `striver.json` — 66 rows from the workbook's **Striver Checklist** sheet: all 18 A2Z steps
  with sub-steps and problem counts, plus 6 rows marked `added: true` for topics Striver omits
  (intervals & sweep line, number theory, segment/Fenwick tree, LLD, SQL). Render those visually
  distinct.
- `courses.json` — 76 rows from the **Course Checklist** sheet: Namaste React (24 items) and
  Namaste Node (45 items), each with its planned week, plus 7 shared bonus items.

---

## 4. Spaced repetition — the core logic

This is the reason the app exists. Put it in `revision.js` as pure functions with **no DOM
access**, so it can be tested in isolation.

```js
r1Due = addDays(dateSolved, 2)
r2Due = addDays(dateSolved, 5)
r3Due = addDays(dateSolved, 10)

status(p, today):
  if (p.r1 && p.r2 && p.r3)                              → 'done'
  if ((!p.r1 && r1Due <= today) ||
      (!p.r2 && r2Due <= today) ||
      (!p.r3 && r3Due <= today))                         → 'due'
  otherwise                                              → 'scheduled'

nextSlot(p)   → 'r1' | 'r2' | 'r3' | null   (first false one, in order)
needsRedo(p)  → p.confidence <= 2 || p.solvedHow === 'editorial'
```

**Queue ordering.** Sort `due` problems by their earliest unticked due date, ascending — most
overdue first. Tie-break on `dateSolved` ascending.

**Ticking.** One button per queued problem. It sets `nextSlot(p) = true`. It does not skip
ahead: if R1 is untouched, ticking sets R1 even when R2 is also overdue.

**Backlog guard.** When `due > 25`, show a persistent banner at the top of the Today screen:
*"Revision backlog: N problems. Stop taking new topics for two days and clear this."* Use the
error colour. This is the single most important warning in the app — a backlog that is never
cleared means those problems were never really learned.

---

## 5. Screens

Seven views plus help. Route with the URL hash (`#/today`, `#/problems`, …) so back/forward and
refresh work. Default to `#/today`.

### 5.1 Today — the home screen

The screen used twice a day. It must load fast and need zero clicks to be useful.

- **Header:** today's date, `Week N of 32`, phase name, and the current phase's date range.
- **The day strip** (see §6) as a thin horizontal motif.
- **Two panels, dawn on the left, dusk on the right:**
  - *Morning 06:30–09:30* — today's `learn` and `practise` text from the curriculum, with the
    time sub-blocks (Revision 06:30, Learn 06:50, Practise 07:50, Log 09:20).
  - *Night 21:00–00:00* — today's evening task.
  - On Sundays, render the two `sun` entries instead and label the card *Consolidation*.
- **Revision queue.** For each due problem: name, topic, difficulty, days overdue, and a
  **✓ Recalled** button.
  - **The approach line is hidden by default behind a "Reveal" toggle.** This is deliberate and
    must not be changed: recall has to be attempted before the answer is visible, or the
    exercise is worthless.
  - Empty state: *"Nothing due. Either you're ahead, or you haven't logged anything yet."*
- **Quick log form.** Collapsed to a single "+ Log a problem" button; expands inline. Defaults:
  date = today, week = current week, topic + Striver step prefilled from the curriculum for
  this week. Submitting keeps the form open and clears it, so several problems can be logged
  in a row. `Esc` closes.

### 5.2 Problems

Full table of every logged problem. Columns: date, week, topic, name, difficulty, solved-how,
minutes, complexity, confidence, revision status (colour-coded), redo flag.

- Text search across name, topic, approach.
- Filters: topic, difficulty, status, solved-how, redo-only.
- Sort by any column.
- Click a row to open a detail modal — full approach, link, notes, all three revision
  checkboxes individually editable, edit and delete.
- Footer shows filtered count vs total.

### 5.3 Roadmap

Port the design from `dsa-dev-roadmap.html` rather than reinventing it: the centre spine, the
numbered week nodes, dawn track left, dusk track right, phase headers.

- Click a week → modal with all 8 day cards (6 weekdays, Sunday, and the "Every day" block).
- Each week has a status control: not-started / in-progress / done.
- Progress bar across the top: weeks done out of 32.
- Highlight the current week automatically.
- Per-week problem count: logged vs the target from the plan.

### 5.4 Progress

- **Stat cards:** total logged, due now, scheduled, fully revised, flagged for redo,
  solved-alone rate, average confidence, average minutes, current streak, weeks completed.
- **Solved-alone rate** turns amber below 40% with the note: *"You're reading editorials, not
  solving. Take fewer problems and fight harder for each."*
- **Streak** = consecutive days up to today with at least one problem logged.
- **By topic** — horizontal bars, 18 topics, solved count each.
- **By difficulty** — easy/medium/hard split.
- **Revision health** — the due count over the last 30 days as a small sparkline, so a growing
  backlog is visible before it becomes unrecoverable.

### 5.5 Courses

Two tabs.

- **Namaste** — React and Node episode lists, grouped by section, each with `Watched` and
  `Built it` toggles. Only `Built it` counts toward the progress bar; make that explicit in the
  UI: *"Watching without building is not progress."*
- **Striver A2Z** — 18 steps with sub-steps, problem counts, `started` and `cleared` toggles.
  Rows marked `added: true` render in the dusk colour with a small "+" badge and a tooltip:
  *"Not in Striver's sheet — added because product companies ask it."*

Both group by planned week and show which week you're currently in.

### 5.6 Applications

Table: date applied, company, role, source, status, last contact, days since, next action,
notes. Status is a dropdown (Applied → Referred → OA sent → OA done → Round 1/2/3 → HR → Offer
/ Rejected / Ghosted). Days-since turns amber past 10 with a "follow up" hint. Offer rows go
sage, rejected rows go muted. Add form inline.

### 5.7 Data

- **Export** — download the whole store as `dsa-tracker-backup-YYYY-MM-DD.json`.
- **Import** — file picker, validate `schemaVersion`, show a diff summary
  (*"This file has 143 problems. You currently have 0. Replace?"*), then confirm.
- **Last backup** date, with a warning if it is more than 7 days old or never.
- **Reset** — type the word `DELETE` to confirm.

### 5.8 Help

The workbook's Read Me content as a static page: the daily shape, the revision rule, what each
screen is for, and the two warnings (backlog over 25, solved-alone under 40%).

---

## 6. Design

**Minimal.** Hairline borders, generous whitespace, no drop shadows except on the modal, no
gradients, no icons unless they carry meaning. The interface should feel like a well-set
printed page. Content max-width 1080px, centred.

### Tokens — copy exactly from `dsa-dev-roadmap.html`

```css
--paper:#EFEDE4;  --paper-2:#E7E4D9;  --card:#F7F6F0;
--ink:#16171D;    --void:#0D0E13;
--muted:#6E6B62;  --faint:#A19D93;
--line:#DAD6C8;   --line-2:#C6C1B0;
--dawn:#A66A00;   --dawn-wash:#F3E9D5;   /* morning / DSA */
--dusk:#2E3A8C;   --dusk-wash:#E3E6F3;   /* night / dev   */
--sage:#4A7256;                          /* done          */
--alert:#B00020;                         /* backlog, overdue */
```

Dawn is used for everything morning and DSA. Dusk for everything evening and development. Sage
only ever means completed. Alert only for the backlog warning and overdue counts — if
everything is red, nothing is.

### Type — the same three faces as the roadmap page

```
Display  Bricolage Grotesque   400 / 600 / 800   — page titles, stat numbers, week numbers
Body     IBM Plex Sans         400 / 500 / 600   — all prose, tables, forms
Data     IBM Plex Mono         400 / 500 / 600   — dates, times, counts, labels, eyebrows
```

Scale: page title `clamp(32px, 5vw, 52px)` Bricolage 600, letter-spacing `-.02em`. Section
heading 25px Bricolage 600. Body 15px Plex Sans. Table and secondary text 13.5px. Eyebrow and
label 10.5px Plex Mono uppercase, letter-spacing `.16em`. Numeric data always Plex Mono so
columns align.

### The day strip — the signature element

The 24-hour bar from the roadmap hero: the whole day dark, with 6:30–9:30 lit in dawn and
21:00–24:00 lit in dusk. It encodes the one true thing about this plan — you own 6 of 24 hours.

```css
background: linear-gradient(90deg,
  var(--void) 0 27.08%, var(--dawn) 27.08% 39.58%,
  var(--void) 39.58% 87.5%, var(--dusk) 87.5% 100%);
```

Full height (60px) in the Today header; a 4px rule elsewhere. Reuse it; do not invent a second
visual motif.

### Behaviour

- Responsive to 380px. On mobile the two Today panels stack, dawn first.
- Visible keyboard focus rings everywhere. Full keyboard operation.
- Respect `prefers-reduced-motion`.
- **Any progressive-reveal effect must fail open** — if the reveal code throws, content shows
  anyway. Never let a decorative script be able to blank the page.
- Shortcuts: `n` new problem, `/` focus search, `Esc` close modal, `1`–`7` switch views.

---

## 7. Sheet → screen mapping

| Workbook sheet | Where it goes |
|---|---|
| Problem Log | Problems (§5.2) + quick log on Today |
| Revision Today | Today's revision queue (§5.1) |
| Revision Dashboard | Progress (§5.4) |
| 32-Week Plan | Roadmap (§5.3) |
| Striver Checklist | Courses → Striver tab |
| Course Checklist | Courses → Namaste tab |
| Daily Log | Optional daily entry on Today; feeds Progress |
| Applications | Applications (§5.6) |
| Read Me | Help (§5.8) |
| Google Sheets Setup | Dropped — not needed |

---

## 8. Data safety — non-negotiable

This holds eight months of work in browser storage that one careless "clear browsing data" can
erase. Treat backup as a feature, not an afterthought.

1. Export to JSON must work from day one, before any other polish.
2. Warn on the Today screen if the last export is over 7 days old.
3. Offer a backup after every 25 newly logged problems.
4. Never destroy data on a schema change — migrate, and keep the old copy under
   `dsa-tracker-v1-backup-<timestamp>` until the migration is confirmed.
5. Wrap every `localStorage` call in try/catch. On quota or private-mode failure, tell the user
   plainly and offer an immediate export.

---

## 9. Build order

Ship each phase working before starting the next.

1. **Skeleton** — `index.html`, tokens, fonts, nav, hash router, empty views.
2. **Store** — `store.js`, schema, load/save, export/import. Test in the console first.
3. **Curriculum** — extraction script → `curriculum.json`, verified counts.
4. **Revision engine** — `revision.js` pure functions + the tests in §10. *Nothing else until
   these pass.*
5. **Today** — day panels, revision queue with reveal-then-tick, quick log, backlog banner.
6. **Problems** — table, filters, detail modal, edit/delete.
7. **Roadmap** — timeline, week modal, status toggles.
8. **Progress** — stats, topic bars, warnings.
9. **Courses + Applications.**
10. **Help, keyboard shortcuts, responsive pass, accessibility pass.**

Phases 1–5 are the product. Everything after is useful but optional; if time runs short, a
working Today screen beats six half-finished ones.

---

## 10. Acceptance tests

Write these as runnable assertions against `revision.js`, then confirm each by hand in the UI.

| # | Setup | Expected |
|---|---|---|
| 1 | Problem solved 5 days ago, nothing ticked | status `due`; R1 and R2 overdue, R3 not; `nextSlot` = `r1` |
| 2 | Tick once | still `due` (R2 overdue); `nextSlot` = `r2` |
| 3 | Tick twice | `scheduled` — R3 is still in the future |
| 4 | Tick three times | `done`; leaves the queue; counts in "fully revised" |
| 5 | Solved today | `scheduled`, not in today's queue |
| 6 | confidence = 2 | `needsRedo` true |
| 7 | solvedHow = `editorial`, confidence = 5 | `needsRedo` true |
| 8 | 26 problems due | backlog banner visible |
| 9 | Log 3 problems, hard-refresh | all 3 still there |
| 10 | Export → reset → import | identical state restored |
| 11 | Empty store, first ever load | no crash, no error text, sensible empty states |
| 12 | Open at 00:30 local time | "today" is the correct local date, not yesterday |

Test 12 exists because the naive `toISOString()` approach fails for IST users before 5:30am —
which is exactly when this app is used.

---

## 11. Out of scope

No backend, no accounts, no sync across devices, no notifications, no service worker, no
analytics, no dark mode, no charting library. Single user, single browser, offline-capable by
virtue of having no network dependency.
