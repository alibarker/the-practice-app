# The Practice App — Plan

A practice-session timer for trumpet. Pick a routine based on how much time you have. While you practise, the app shows the section you're in, how long is left in it, and what's coming next. A button moves on when you're ready.

Primary device: **iPad** (on a music stand, landscape or portrait). It also has to work on a phone and a laptop. One user, no accounts.

---

## 1. Decisions

| Topic        | Decision                                                                                                                                               | Why                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Delivery     | **Progressive Web App (PWA)**, installed with Safari → Share → _Add to Home Screen_                                                                    | Runs on iPad, phone and laptop from one codebase. No App Store and no $99/yr Apple account. Works offline.                  |
| Stack        | **React + TypeScript + Vite**                                                                                                                          | Large ecosystem with good libraries for later work (pdf.js, Dexie, Web Audio). Developer-friendly.                          |
| PWA tooling  | `vite-plugin-pwa` (Workbox)                                                                                                                            | Generates the service worker and manifest. Full offline support.                                                            |
| Storage      | **Local-first.** Active session in `localStorage`; session history in **IndexedDB via Dexie**. Optional **Supabase** sync (see 2.6)                    | The app never waits on the network, so it works offline in a practice room. Sync keeps devices in step when online.         |
| Hosting      | **GitHub Pages**, deployed automatically by GitHub Actions on push to `main`                                                                           | Free. URL: `https://alibarker.github.io/the-practice-app/`                                                                  |
| Routing      | Simple view state in `App.tsx`, no router                                                                                                              | There's a single URL, so GitHub Pages has nothing to 404 on. A reload restores an active session through the resume banner. |
| Testing / CI | **Vitest** unit tests (timer and session logic), ESLint, Prettier, `tsc` typecheck. One GitHub Action runs lint, typecheck, test, build, then deploys. | Most of the risk is in the timer maths, which unit tests cover well.                                                        |
| App name     | **The Practice App** (manifest `short_name`: "Practice")                                                                                               | Matches the repo. The short name fits under the home-screen icon.                                                           |
| Theme        | Dark mode, following the system setting                                                                                                                | Easy on the eyes on a stand.                                                                                                |

---

## 2. v1 scope

### 2.1 Home screen: choose a plan

- One large card per hardcoded plan: **25 min**, **45 min** and **60 min**.
- Each card shows the plan name, the **computed real total** (sum of section durations) and the number of sections.
- **Tapping a card starts the session immediately.** There's no preview screen.
  - The tap also unlocks Wake Lock (and audio, for later), which iOS only allows after a user gesture.
- If an unfinished session exists (e.g. after a reload), a banner offers **Resume** or **Discard**.
- A link to **History**.

### 2.2 Practice screen

Designed to be read from 1–2 m away: very large timer digits and big tap targets (≥ 64 px). It works in landscape and portrait, with a narrow phone layout as well.

**Shows:**

- **Current section title** (large) and its **notes** (smaller, underneath).
- **Time left in section**, counting down as `m:ss`.
  - When it reaches zero it keeps going **negative** (`-0:42`) and the screen turns into the **over warning** (red timer and red accent).
  - **Each extra minute over**, the screen gives a **silent visual pulse**. There is no sound.
- A **progress bar** for the current section, which fills, then turns red and stays full when over.
- A **"Next up" hint**: `Next: Lip slurs · 5 min` (title and duration). The last section shows `Last section`.
- **Total time left** in the session: `max(current remaining, 0) + sum of remaining sections`. Overruns therefore push this out live. Also shows how far you are over or under the plan, e.g. `+2:30 over plan`.
- **Total elapsed** practice time, excluding paused time.
- A **section list** with every section marked done ✓, current ▶, or upcoming. Done sections show their actual time.

**Controls:**

- **Next** (primary, largest). It moves to the next section; on the last section it reads **Finish**.
- **Pause / Resume.** Pausing freezes all timers and shows a clear "Paused" state.
- **Previous section.** Goes back one section. That section's timer **restarts from its full duration**; time already spent stays in the history record.
- **Jump to any section** by tapping it in the section list.
- **End session early.** Asks for confirmation, then goes to the summary.

**Rest sections** use the same timer and behaviour (you still tap Next) but look different: a different accent colour and a rest icon. They're flagged with `kind: 'rest'`.

### 2.3 Summary screen (on finish or end early)

- Plan name, start time, total planned vs. actual, and paused time.
- A per-section table showing planned vs. actual, with overruns highlighted. Skipped sections are marked as skipped.
- The session is **saved to history** automatically.
- **Done** returns to the home screen.

### 2.4 History screen

- A simple list, newest first: date/time, plan name, planned vs. actual duration, and whether it was completed or ended early.
- Tap an entry to see its per-section breakdown (the same view as the summary), with a **Delete** button.
- The list updates live, so sessions synced from another device appear without leaving the screen.

### 2.5 Robustness

- **Screen Wake Lock** (`navigator.wakeLock.request('screen')`) is held while a session is active, and re-requested on `visibilitychange` because iOS releases it when the app is hidden.
- **The timer uses real (wall-clock) time.** All times come from timestamps (`Date.now()`), never from counting ticks. Time keeps passing while the app is in the background or the screen is locked.
- **Resume after reload.** The active session state is written to `localStorage` on every state change, so a reload or app relaunch restores it exactly.
- **Storage persistence.** Call `navigator.storage.persist()` on first run. iOS only keeps storage long-term for home-screen-installed PWAs; in a plain Safari tab, data can be evicted after about 7 days of no use. The README will say to install to the home screen.

### 2.6 Sync across devices (Supabase)

Added after v1. Optional: a build without Supabase settings has sync turned off and hides its UI. Setup steps are in the README.

- **Local-first.** IndexedDB on each device is the source the app reads and writes. Sync runs alongside it, so practice never depends on a connection.
- **Sign-in:** email plus a one-time **code** (Supabase email OTP). It doesn't use magic links, because on iOS a link opens Safari, which has separate storage from the home-screen app.
- **What syncs:** session history. The session in progress stays on its device.
- **Records:** UUID ids (so devices never collide), plus `modifiedAt` and `deletedAt` (soft delete, so deletions spread to other devices). Locally, a `dirty` flag marks rows the server hasn't seen yet.
- **Engine** (`src/sync/engine.ts`, independent of Supabase so it's unit-tested and reusable for plans and logs later):
  1. Push dirty rows (upsert). Mark them clean only if they didn't change during the push.
  2. Pull rows changed since the last pull, paged. The cursor is the server-stamped `updated_at`, so device clock differences don't matter.
  3. Conflicts: **newest `modifiedAt` wins**, enforced both on the device and by a database trigger that ignores older writes.
- **When it syncs:** on app open or sign-in, after saving or deleting a session, when the device comes back online, and when the app returns to the foreground (at most once a minute). There's also a **Sync now** button.
- **Security:** row-level security limits every row to its owner (`user_id` defaults to `auth.uid()`). There's no delete policy, so deletes are always soft. The URL and publishable key in the build are public by design.
- **Migration:** v1 history (numeric ids) moves to the new table with UUIDs on first launch, marked dirty, so it uploads on the first sign-in.
- **Sign-out** keeps history on the device. Anything new uploads on the next sign-in.

### Out of scope for v1

- Creating or editing plans (plans are hardcoded in `src/data/plans.ts`).
- Sound of any kind.
- Export/import. (Sync was added afterwards: see 2.6.)

---

## 3. Hardcoded plans

Range rule: **use the maximum** of each range. **Exception:** the 25-min plan uses the **minimum** of each range.

At minimums the 25-min plan came to 26 min, so **Tune + improvisation was trimmed from 5 to 4 min** to make it exactly 25. The home screen shows each plan's real computed total when it differs from its name (e.g. _"45 min · 47 min · 9 sections"_).

### 25 min (real total 25 min)

| #   | Title                | Notes                                      | Min |
| --- | -------------------- | ------------------------------------------ | --- |
| 1   | Breathing + buzzing  | Breathing exercises and mouthpiece buzzing | 3   |
| 2   | Long tones           | G down to low C and back, soft             | 5   |
| 3   | Lip slurs            | Through the valve combinations             | 5   |
| 4   | Technique            | Clarke study or scales with metronome      | 5   |
| 5   | Gentle range         | Stepwise to your comfortable top           | 2   |
| 6   | Tune + improvisation |                                            | 4   |
| 7   | Warm-down            | Soft low notes                             | 1   |

### 45 min (real total 47 min)

| #   | Title               | Notes                                          | Min |
| --- | ------------------- | ---------------------------------------------- | --- |
| 1   | Breathing + buzzing |                                                | 4   |
| 2   | Long tones          | Plus soft attacks                              | 7   |
| 3   | Lip slurs           | Plus wider intervals                           | 7   |
| 4   | Rest _(rest)_       |                                                | 3   |
| 5   | Technique           | Clarke, scales, arpeggios; rotate articulation | 8   |
| 6   | Range work          |                                                | 4   |
| 7   | Rest _(rest)_       |                                                | 2   |
| 8   | Repertoire          | Standard or transcription                      | 10  |
| 9   | Warm-down           |                                                | 2   |

### 60 min (real total 61 min)

| #   | Title               | Notes                                       | Min |
| --- | ------------------- | ------------------------------------------- | --- |
| 1   | Breathing + buzzing |                                             | 5   |
| 2   | Long tones          | Full range + dynamics                       | 8   |
| 3   | Slurs + lip trills  |                                             | 8   |
| 4   | Rest _(rest)_       |                                             | 3   |
| 5   | Technique           | Clarke, scales, jazz patterns (ii–V, bebop) | 10  |
| 6   | Etude               | Arban, Charlier, lyrical                    | 7   |
| 7   | Rest _(rest)_       |                                             | 3   |
| 8   | Range + endurance   |                                             | 5   |
| 9   | Standard in depth   | Play-along                                  | 10  |
| 10  | Warm-down           |                                             | 2   |

---

## 4. Data model

The model is designed so that **session logging** (the top future priority) can be added without migrations. Sections have stable IDs, and every section record already has a slot for a log.

```ts
// Plans (hardcoded in v1, user-editable later)
type SectionKind = 'play' | 'rest';

interface PlanSection {
  id: string; // stable, e.g. 'p45-long-tones'
  title: string;
  notes?: string;
  durationSec: number;
  kind: SectionKind;
  // future: minDurationSec?, maxDurationSec?, tempoBpm?, pdfId?
}

interface Plan {
  id: string; // 'plan-25' | 'plan-45' | 'plan-60'
  name: string; // '25 min'
  sections: PlanSection[];
  // future: createdAt, updatedAt, isBuiltIn
}

// Active session (localStorage key 'activeSession'): pure timestamps
interface ActiveSession {
  planId: string;
  planSnapshot: Plan; // copy, so later plan edits don't corrupt a live or old session
  startedAt: number; // epoch ms
  currentIndex: number;
  sectionStartedAt: number; // epoch ms when the current section (re)started
  pausedAt: number | null; // set while paused
  sectionPausedMs: number; // paused time accumulated in the current section
  totalPausedMs: number;
  sectionRecords: SectionRecord[]; // one per plan section, filled as you go
}

interface SectionRecord {
  sectionId: string;
  plannedSec: number;
  actualMs: number; // summed across visits (Previous/Jump can revisit), excluding pauses
  visited: boolean;
  log?: SectionLog; // reserved for v2 session logging
}

interface SectionLog {
  // v2: shape sketched now, not used in v1
  exercises?: string[];
  tempoBpm?: number;
  articulation?: string;
  notes?: string;
}

// What finishSession produces
interface SessionSummary {
  planId: string;
  planName: string;
  startedAt: number;
  endedAt: number;
  completed: boolean; // false if ended early
  plannedTotalSec: number;
  actualTotalMs: number; // excluding pauses
  pausedTotalMs: number;
  sections: (SectionRecord & { title: string; kind: SectionKind })[];
  // future: sessionNotes?
}

// Fields on every synced record
interface SyncFields {
  id: string; // UUID
  modifiedAt: number; // last change, by the device that made it; newest wins
  deletedAt: number | null; // soft delete
}

// History (IndexedDB via Dexie, table 'history'; Supabase table public.sessions)
type SessionHistory = SessionSummary & SyncFields; // stored locally with dirty: 0 | 1
```

### Timer logic (pure functions, fully unit-tested)

- `sectionElapsedMs(s, now) = (pausedAt ?? now) - sectionStartedAt - sectionPausedMs`
- `sectionRemainingMs = durationSec*1000 - sectionElapsedMs` (can be negative, which means over)
- `minutesOver = floor(-sectionRemainingMs / 60000)` when over. Each time it increments, the visual pulse fires.
- `sessionRemainingMs = max(sectionRemainingMs, 0) + sum(durations of sections after current)`
- `vsPlanMs = (elapsed so far + sessionRemainingMs) - plannedTotal`
- `startSession` creates a session. `reduceSession` handles `next | previous | jumpTo(i) | pause | resume`; each move adds the current section's elapsed time to its `actualMs` first. Navigating while paused stays paused. `finishSession(completed)` produces the history record (finish = completed, End = ended early).
- Sessions under 10 s of practice (`MIN_SAVED_SESSION_MS`) aren't saved to history, so an accidental tap on a plan card leaves no trace.
- The UI re-renders on a 250 ms interval tick (and on `visibilitychange`). The tick only triggers a re-render; it never holds time state.

---

## 5. Project structure

```
the-practice-app/
├─ plan.md
├─ README.md                 # dev setup, install-to-home-screen instructions
├─ index.html
├─ vite.config.ts            # base: '/the-practice-app/', vite-plugin-pwa
├─ public/                   # icons (192, 512, maskable, apple-touch-icon)
├─ src/
│  ├─ main.tsx, App.tsx
│  ├─ data/plans.ts          # hardcoded plans
│  ├─ domain/
│  │  ├─ types.ts
│  │  ├─ timer.ts            # pure time maths
│  │  ├─ session.ts          # reducer
│  │  └─ *.test.ts
│  ├─ storage/
│  │  ├─ activeSession.ts    # localStorage
│  │  └─ db.ts               # Dexie history
│  ├─ sync/                  # engine, Dexie adapter, Supabase adapter, sign-in + status
│  ├─ hooks/                 # useNow, useWakeLock
│  ├─ screens/               # Home, Practice, Summary, History (+ detail), Account (sync)
│  ├─ components/            # ProgressBar, SectionList, SessionBreakdown, SyncBadge
│  └─ styles/                # CSS variables, dark/light, large type
├─ supabase/migrations/      # table, RLS, newest-change-wins trigger
└─ .github/workflows/ci.yml  # lint, typecheck, test, build, deploy to Pages
```

---

## 6. Milestones

Milestones 1–7 are done: v1 is built, deployed to GitHub Pages and working on the iPad. Then:

8. **Sync** (2.6). Built. Remaining: the Supabase project setup in the README, then a real two-device check.

---

## 7. Future work (in priority order)

1. **Session logging** _(top priority; the data model is ready, and logs will sync through the same engine)_. Per section, record what was done: exercises, tempos, articulations and free notes. Edit on the summary screen and while practising. History detail shows the logs.
2. **Plan editor.** Create, duplicate, edit and reorder plans and sections. Possibly real min/max ranges with a "target vs. over" display. Built-in plans become editable copies.
3. **Metronome.** Web Audio with lookahead scheduling for accurate timing. Per-section default tempo (e.g. Clarke at ♩=100), which also feeds the log.
4. **PDFs for notation.** Store PDFs in IndexedDB, attach them to sections, and render them with pdf.js beside the timer.
5. **Tuner.** Mic input (`getUserMedia`) with pitch detection (autocorrelation/YIN), showing concert or B♭ pitch.

- Later ideas: export/import backup, a practice streak and stats, sound cues (optional), and a custom domain.

---

## 8. Known risks / iOS caveats

- **Wake Lock in home-screen PWAs** was buggy on some iOS versions; it works in recent iOS (18.4+). Fallback: a muted looping-video "NoSleep" trick if testing shows problems.
- **Storage eviction.** Only installed PWAs are safe from Safari's 7-day eviction. With sync on, Supabase holds a copy, so a wiped device gets its history back on sign-in. Without sync, history lives only on the device.
- **Supabase free tier** pauses projects after about a week with no activity. Sync fails until the project is restored in the dashboard, but practice keeps working offline.
- **Audio** (for later features) needs a user gesture to unlock. The Start tap will handle it.

---

## 9. Resolved questions

1. The 25-min plan came to 26 min at minimums. **Resolved:** Tune + improvisation trimmed from 5 to 4 min, so it's exactly 25.
2. Accidental taps on a plan card start a session immediately. **Resolved:** no confirmation; sessions with under 10 s of practice aren't saved to history.
