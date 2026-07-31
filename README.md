# DSA Tracker

**Live app: https://dsa-tracker-five-pearl.vercel.app/**

A 32-week study tracker for cracking DSA and development side by side:
mornings on [Striver's A2Z sheet](https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2)
(in Python), nights on Namaste React & Node, six days a week, with a built-in
**spaced-repetition engine** that brings every problem you solve back at
**day 2, day 5 and day 10** until you actually own it.

One account, all your problems, revisions and progress — on any device.
Your study data is visible only to you.

---

## Getting started (2 minutes)

1. Open the app and **Create account** — email, password, and the name you
   want shown in the app.
2. On the setup screen, lock in three things:
   - **Day 1** — the exact date you start. Every week and every revision date
     is counted from this day. Weeks are 7-day blocks: six study days, then
     **Day 7 to consolidate** (no new topics — you re-solve what fought back
     and cover core CS).
   - **Your DSA window** — a 3-hour block, whenever suits your life
     (default 06:30–09:30).
   - **Your dev window** — a second 3-hour block (default 21:00–00:00).
3. That's it. The Today screen now shows exactly what to do, every day, for
   32 weeks.

All three settings can be changed later on the **Data** screen — but changing
Day 1 **resets your tracker** and restarts the 32 weeks, so pick it carefully.

## The daily loop

**In your DSA window:**

| When | What |
|---|---|
| First 20 min | **Revision queue.** For each problem due: read the title, say the approach and complexity *out loud*, **then** press *Reveal* to check yourself. Got it → **✓ Recalled**. Didn't → leave it, re-solve on Day 7. |
| Next 60 min | **Learn** — the day's topic (video/article), notes in your own words. |
| Next 90 min | **Practise** — the day's listed problems. Fight for 25 minutes before any hint. |
| Last 10 min | **Log** — press **`n`** and log every problem you solved. Twenty seconds each. **This is what builds your revision queue** — an unlogged problem is never revised. |

**In your dev window:** the Night panel shows the day's build task. Tick
episodes in **Courses** only after you've *built along* — watching without
building is not progress. Push your code before you stop.

**On Day 7:** no new topics. The morning is consolidation (re-solve the
week's hardest cold), the evening is core CS or a weekly retro.

## When you log a problem

Fill in honestly — the tracker's warnings only work with honest data:

- **Solved how**: *alone* / *with a hint* / *editorial*. Reading the editorial
  counts as not solving — the problem gets flagged **REDO** no matter how it felt.
- **Confidence 1–5**: 2 or below also flags **REDO**.
- **Approach in one line**: future-you revises from this line, so make it the
  actual idea ("sort by end time, greedy pick"), not "solved it".

## The screens

| Screen | What it's for |
|---|---|
| **Today** | The home screen, twice a day: the day's plan, the revision queue, the quick log. |
| **Problems** | Every problem ever logged. Search, filter, sort; click a row to edit, fix revisions, or delete. |
| **Roadmap** | All 32 weeks on one timeline. Click a week for its day-by-day plan; the small circle cycles your status (not started → ◐ in progress → ✓ done). |
| **Progress** | The numbers, honestly: due counts, solved-alone rate, streak, topic and difficulty breakdowns, and a 30-day revision-health line. |
| **Courses** | Every Namaste React/Node episode and every Striver sub-step, mapped to its planned week, with your toggles. |
| **Applications** | From week 19: every application, every follow-up. Rows quietly nag after 10 silent days. |
| **Data** | Your plan settings, backup export/import, and the danger zone. |
| **Help** | The method, your daily shape, and the two warnings — in-app. |

## Keyboard

| Key | Action |
|---|---|
| `n` | Log a new problem |
| `/` | Search problems |
| `1`–`7` | Switch screens |
| `Esc` | Close any modal or form |

## The two warnings that matter

1. **Backlog over 25.** If the Today screen shows the red backlog banner,
   stop taking new topics for two days and clear it. A backlog you never
   clear is the same as never having solved those problems.
2. **Solved-alone under 40%.** If Progress turns this stat amber, you're
   reading editorials rather than solving. Take fewer problems and fight
   harder for each. Four problems you fought for beat twelve you skimmed.

## Your data

- Stored in your account, synced on every change, available on any device.
- **Data → Download backup JSON** now and then anyway — it's your personal
  safety net, and Import restores it anywhere.
- Changing Day 1 resets the tracker (with a warning). **Delete account** on
  the Data screen erases your account and all its data, permanently —
  no email required, no questions asked.

---

## For maintainers

Vanilla HTML/CSS/JS — no framework, no build step. Two modes via
`src/config.js`: **cloud** (Supabase URL + publishable key filled in → sign-in
required, one row per user) or **local** (config empty → no accounts,
localStorage only, works offline over `file://`).

### Backend setup (once, ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. SQL Editor → run:

   ```sql
   create table trackers (
     user_id uuid primary key references auth.users (id) on delete cascade,
     data jsonb not null,
     updated_at timestamptz default now()
   );
   alter table trackers enable row level security;
   create policy "own rows" on trackers
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Self-serve account deletion (Data screen → Delete account).
   create or replace function delete_user()
   returns void
   language sql
   security definer
   set search_path = ''
   as $$
     delete from auth.users where id = auth.uid();
   $$;
   ```

   Row-level security is the boundary: every user reads and writes only their
   own row, enforced by the database. `delete_user()` can only delete the
   caller's own account.
3. Settings → API: copy the *Project URL* and *publishable (anon)* key into
   `src/config.js`. Never use the secret/service_role key anywhere.
4. Authentication → URL Configuration: set the Site URL to the deployed
   address so confirmation/reset emails link back correctly.
5. Heads-up: Supabase's built-in email is rate-limited (~a few per hour).
   For a community launch either disable "Confirm email" or connect custom
   SMTP (e.g. Resend's free tier).

### Deploy

Static site, zero config: Vercel (preset "Other", no build command) or
GitHub Pages (deploy `main`, root folder).

### Development

```
node tests/revision.test.js        # spaced-repetition acceptance tests
node tools/extract-curriculum.js   # regenerate src/data/curriculum.* from the roadmap HTML
```

```
index.html
src/
  main.js          router, onboarding, keyboard shortcuts
  auth.js          Supabase email/password gate
  config.js        backend keys (cloud mode on/off)
  store.js         state, cloud/local persistence, export/import
  revision.js      spaced-repetition engine — pure functions, no DOM
  components/      helpers.js  modal.js  dayStrip.js  problemForm.js
  views/           today problems roadmap progress courses applications data help
  data/            curriculum striver courses (.json + generated .js mirrors)
styles/            tokens.css  base.css  components.css
```

`src/data/*.js` are generated mirrors of the committed `.json` (classic-script
globals are the only way to load local data over `file://`, where `fetch()`
is blocked). Curriculum extracted from `dsa-dev-roadmap.html`; checklists from
the original `dsa-tracker.xlsx`.
