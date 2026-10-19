# The Practice App — Plan

A practice-session timer for trumpet. Pick a routine based on how much time you have. While you practise, the app shows the section you're in, how long is left in it, and what's coming next. A button moves on when you're ready.

Primary device: **iPad** (on a music stand, landscape or portrait). It also has to work on a phone and a laptop. One user, no accounts.

---

## 1. Decisions

| Topic | Decision | Why |
|---|---|---|
| Delivery | **Progressive Web App (PWA)**, installed with Safari → Share → *Add to Home Screen* | Runs on iPad, phone and laptop from one codebase. No App Store and no $99/yr Apple account. Works offline. |
| Stack | **React + TypeScript + Vite** | Large ecosystem with good libraries for later work (pdf.js, Dexie, Web Audio). Developer-friendly. |
| PWA tooling | `vite-plugin-pwa` (Workbox) | Generates the service worker and manifest. Full offline support. |
| Storage | **On the device only.** Active session in `localStorage`; session history in **IndexedDB via Dexie** | Simple and private. IndexedDB will also hold logs and PDFs later. |
| Hosting | **GitHub Pages**, deployed automatically by GitHub Actions on push to `main` | Free. URL: `https://alibarker.github.io/the-practice-app/` |
| Routing | `HashRouter` (or simple view state) | GitHub Pages has no SPA fallback, so this avoids 404s on refresh. |
| Testing / CI | **Vitest** unit tests (timer and session logic), ESLint, Prettier, `tsc` typecheck. One GitHub Action runs lint, typecheck, test, build, then deploys. | Most of the risk is in the timer maths, which unit tests cover well. |
| App name | **The Practice App** (manifest `short_name`: "Practice") | Matches the repo. The short name fits under the home-screen icon. |
| Theme | Dark mode, following the system setting | Easy on the eyes on a stand. |

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
- Tap an entry to see its per-section breakdown (the same view as the summary).

### 2.5 Robustness
- **Screen Wake Lock** (`navigator.wakeLock.request('screen')`) is held while a session is active, and re-requested on `visibilitychange` because iOS releases it when the app is hidden.
- **The timer uses real (wall-clock) time.** All times come from timestamps (`Date.now()`), never from counting ticks. Time keeps passing while the app is in the background or the screen is locked.
- **Resume after reload.** The active session state is written to `localStorage` on every state change, so a reload or app relaunch restores it exactly.
- **Storage persistence.** Call `navigator.storage.persist()` on first run. iOS only keeps storage long-term for home-screen-installed PWAs; in a plain Safari tab, data can be evicted after about 7 days of no use. The README will say to install to the home screen.

### Out of scope for v1
- Creating or editing plans (plans are hardcoded in `src/data/plans.ts`).
- Sound of any kind.
- Export/import and sync.

---

## 3. Hardcoded plans

Range rule: **use the maximum** of each range. **Exception:** the 25-min plan uses the **minimum** of each range.

> ⚠️ **Note:** even at minimums, the 25-min plan sums to **26 min** (3+5+5+5+2+5+1), not 25. The home screen shows the real computed total, so the card will read *"25 min plan · 26 min"*. To make it exactly 25, trim one section by a minute (open question 1).

### 25 min (real total 26 min)
| # | Title | Notes | Min |
|---|---|---|---|
| 1 | Breathing + buzzing | Breathing exercises and mouthpiece buzzing | 3 |
| 2 | Long tones | G down to low C and back, soft | 5 |
| 3 | Lip slurs | Through the valve combinations | 5 |
| 4 | Technique | Clarke study or scales with metronome | 5 |
| 5 | Gentle range | Stepwise to your comfortable top | 2 |
| 6 | Tune + improvisation | | 5 |
| 7 | Warm-down | Soft low notes | 1 |

### 45 min (real total 47 min)
| # | Title | Notes | Min |
|---|---|---|---|
| 1 | Breathing + buzzing | | 4 |
| 2 | Long tones | Plus soft attacks | 7 |
| 3 | Lip slurs | Plus wider intervals | 7 |
| 4 | Rest *(rest)* | | 3 |
| 5 | Technique | Clarke, scales, arpeggios; rotate articulation | 8 |
| 6 | Range work | | 4 |
| 7 | Rest *(rest)* | | 2 |
| 8 | Repertoire | Standard or transcription | 10 |
| 9 | Warm-down | | 2 |

### 60 min (real total 61 min)
| # | Title | Notes | Min |
|---|---|---|---|
| 1 | Breathing + buzzing | | 5 |
| 2 | Long tones | Full range + dynamics | 8 |
| 3 | Slurs + lip trills | | 8 |
| 4 | Rest *(rest)* | | 3 |
| 5 | Technique | Clarke, scales, jazz patterns (ii–V, bebop) | 10 |
| 6 | Etude | Arban, Charlier, lyrical | 7 |
| 7 | Rest *(rest)* | | 3 |
| 8 | Range + endurance | | 5 |
| 9 | Standard in depth | Play-along | 10 |
| 10 | Warm-down | | 2 |

---

## 4. Data model

The model is designed so that **session logging** (the top future priority) can be added without migrations. Sections have stable IDs, and every section record already has a slot for a log.

```ts
// Plans (hardcoded in v1, user-editable later)
type SectionKind = 'play' | 'rest';

interface PlanSection {
  id: string;            // stable, e.g. 'p45-long-tones'
  title: string;
  notes?: string;
  durationSec: number;
  kind: SectionKind;
  // future: minDurationSec?, maxDurationSec?, tempoBpm?, pdfId?
}

interface Plan {
  id: string;            // 'plan-25' | 'plan-45' | 'plan-60'
  name: string;          // '25 min'
  sections: PlanSection[];
  // future: createdAt, updatedAt, isBuiltIn
}

// Active session (localStorage key 'activeSession'): pure timestamps
interface ActiveSession {
  planId: string;
  planSnapshot: Plan;          // copy, so later plan edits don't corrupt a live or old session
  startedAt: number;           // epoch ms
  currentIndex: number;
  sectionStartedAt: number;    // epoch ms when the current section (re)started
  pausedAt: number | null;     // set while paused
  sectionPausedMs: number;     // paused time accumulated in the current section
  totalPausedMs: number;
  sectionRecords: SectionRecord[];  // one per plan section, filled as you go
}

interface SectionRecord {
  sectionId: string;
  plannedSec: number;
  actualSec: number;           // summed across visits (Previous/Jump can revisit)
  visited: boolean;
  log?: SectionLog;            // reserved for v2 session logging
}

interface SectionLog {          // v2: shape sketched now, not used in v1
  exercises?: string[];
  tempoBpm?: number;
  articulation?: string;
  notes?: string;
}

// History (IndexedDB via Dexie, table 'sessions')
interface SessionHistory {
  id?: number;
  planId: string;
  planName: string;
  startedAt: number;
  endedAt: number;
  completed: boolean;          // false if ended early
  plannedTotalSec: number;
  actualTotalSec: number;      // excluding pauses
  pausedTotalSec: number;
  sections: SectionRecord[];
  // future: sessionNotes?
}
```

### Timer logic (pure functions, fully unit-tested)
- `sectionElapsedMs(s, now) = (pausedAt ?? now) - sectionStartedAt - sectionPausedMs`
- `sectionRemainingMs = durationSec*1000 - sectionElapsedMs` (can be negative, which means over)
- `minutesOver = floor(-sectionRemainingMs / 60000)` when over. Each time it increments, the visual pulse fires.
- `sessionRemainingMs = max(sectionRemainingMs, 0) + sum(durations of sections after current)`
- `vsPlanMs = (elapsed so far + sessionRemainingMs) - plannedTotal`
- A session reducer handles `start | next | previous | jumpTo(i) | pause | resume | finish | endEarly`. Each action closes off the current section's `actualSec` before moving.
- The UI re-renders on a `requestAnimationFrame` / 250 ms interval tick. The tick only triggers a re-render; it never holds time state.

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
│  ├─ hooks/                 # useNow, useWakeLock, useSession
│  ├─ screens/               # Home, Practice, Summary, History, HistoryDetail
│  ├─ components/            # BigTimer, ProgressBar, SectionList, NextUp, ...
│  └─ styles/                # CSS variables, dark/light, large type
└─ .github/workflows/ci.yml  # lint, typecheck, test, build, deploy to Pages
```

---

## 6. Milestones

1. **Scaffold.** Vite + React + TS, ESLint, Prettier, Vitest, a CI workflow, and Pages deploy of a "hello" page. Confirm it installs on the iPad from the Pages URL.
2. **Domain.** Types, hardcoded plans, the timer maths and the session reducer, with thorough unit tests (pause/resume, over-time, previous/jump, reload restore, totals).
3. **Practice screen.** Big timer, over state with a per-minute pulse, progress bar, next-up hint, section list, controls, and rest styling.
4. **Home + resume.** Plan cards, a resume/discard banner, and `localStorage` persistence.
5. **Wake Lock + PWA.** Manifest, icons, service worker/offline, wake-lock handling, and `storage.persist()`.
6. **Summary + history.** Dexie store, summary screen, history list and detail.
7. **Device QA.** Real iPad testing in both orientations, plus phone and laptop. Lock/unlock, app switching and reload mid-session.

---

## 7. Future work (in priority order)

1. **Session logging** *(top priority, and the data model is ready for it)*. Per section, record what was done: exercises, tempos, articulations and free notes. Edit on the summary screen and while practising. History detail shows the logs.
2. **Plan editor.** Create, duplicate, edit and reorder plans and sections. Possibly real min/max ranges with a "target vs. over" display. Built-in plans become editable copies.
3. **Metronome.** Web Audio with lookahead scheduling for accurate timing. Per-section default tempo (e.g. Clarke at ♩=100), which also feeds the log.
4. **PDFs for notation.** Store PDFs in IndexedDB, attach them to sections, and render them with pdf.js beside the timer.
5. **Tuner.** Mic input (`getUserMedia`) with pitch detection (autocorrelation/YIN), showing concert or B♭ pitch.
- Later ideas: export/import backup, sync across devices, a practice streak and stats, sound cues (optional), and a custom domain.

---

## 8. Known risks / iOS caveats
- **Wake Lock in home-screen PWAs** was buggy on some iOS versions; it works in recent iOS (18.4+). Fallback: a muted looping-video "NoSleep" trick if testing shows problems.
- **Storage eviction.** Only installed PWAs are safe from Safari's 7-day eviction. Since storage is on the device only, wiping or deleting the app loses history, so export/import is a cheap later safeguard.
- **Audio** (for later features) needs a user gesture to unlock. The Start tap will handle it.

---

## 9. Open questions
1. The 25-min plan totals **26 min** even at minimums. Keep it, or trim a section by 1 min (e.g. Tune + improvisation 5 → 4)?
2. Tapping a plan card starts straight away, so an accidental tap starts a session. A confirmation isn't needed, since **End session early** gets you out, but a session ended within the first ~10 s could be discarded rather than saved to history. OK?
