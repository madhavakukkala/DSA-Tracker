# DSA Tracker

A 32-week DSA + development study tracker with built-in spaced repetition
(day-2 / day-5 / day-10 revision), following Striver's A2Z sheet and Namaste
React/Node. Vanilla HTML/CSS/JS, no framework, no build step.

Two modes, controlled by `src/config.js`:

- **Cloud mode** (config filled in): sign in with email + password; each user's
  data lives in their own row in Supabase, visible only to them, available on
  any device. This is the mode for sharing with a community.
- **Local mode** (config empty): no accounts; data lives in the browser's
  `localStorage`. Good for personal use — works fully offline via `file://`.

## Use it

Open the app. After sign-in (cloud mode), first launch asks three things:

- **Day 1** — the exact date you start. Every week and revision date counts
  from it. Weeks are 7-day blocks: six study days, then a rest/consolidation day.
- **Your DSA window** — a 3-hour block (default 06:30–09:30).
- **Your dev window** — a 3-hour block (default 21:00–00:00).

All three can be changed later on the Data screen.

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

## Set up the backend (cloud mode, ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com) (any name/region).
2. In the project: **SQL Editor → New query**, paste and run:

   ```sql
   create table trackers (
     user_id uuid primary key references auth.users (id) on delete cascade,
     data jsonb not null,
     updated_at timestamptz default now()
   );
   alter table trackers enable row level security;
   create policy "own rows" on trackers
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```

   The policy is the security boundary: every user can read and write only
   their own row, enforced by the database itself.
3. **Settings → API**: copy the *Project URL* and the *anon public* key into
   `src/config.js`. (The anon key is designed to be public — the row-level
   security above is what protects the data.)
4. Optional: **Authentication → URL Configuration** — set the Site URL to your
   deployed address so password-reset emails link back correctly.
5. Commit and deploy. The sign-in page appears automatically.

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
