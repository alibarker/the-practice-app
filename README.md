# The Practice App

A trumpet practice-session timer. Pick a plan by how much time you have. While you practise it shows the current section, the time left in it, and what's next. When you run over, the timer goes negative and the screen flashes red. It keeps a history of your sessions. See [plan.md](plan.md) for the full design and roadmap.

Live at **https://alibarker.github.io/the-practice-app/** once Pages is enabled (see Deploying below).

## Install on iPad / iPhone

1. Open the URL above in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the home-screen icon. It runs full-screen, works offline, and keeps the screen awake while you practise.

Install it rather than using a Safari tab. iOS can delete data for sites that aren't on the home screen after about 7 days without a visit, and your history only lives on the device.

## Development

```sh
npm install
npm run dev          # http://localhost:5173/the-practice-app/
npm test             # unit tests (Vitest)
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck
npm run build        # production build into dist/
npm run preview      # serve the production build (service worker included)
```

To test on the iPad against your Mac, run `npm run dev -- --host`, then open the printed network URL in Safari on the iPad (same Wi-Fi). Wake Lock and the service worker need HTTPS, so test those on the deployed site.

## Sync across devices (Supabase)

Sync is optional. Without the settings below, the app builds with sync turned off and works entirely on the device. With them, a **Sync** button on the home screen lets you sign in with an emailed code. Your history is then kept in step across every device you sign in on. Each device also keeps its own copy, so the app still works offline.

One-time setup:

1. **Create a project** at [supabase.com](https://supabase.com) (the free tier is plenty).
2. **Create the table:** open **SQL Editor → New query**, paste in [`supabase/migrations/20261019000000_sessions.sql`](supabase/migrations/20261019000000_sessions.sql), and click **Run**.
3. **Send sign-in codes, not links:** go to **Authentication → Emails → Templates**. In both the **Magic Link** and **Confirm signup** templates, replace the link with the code, for example `<p>Your Practice App code: <strong>{{ .Token }}</strong></p>`. (On iPad, a link would open in Safari, not the installed app, so the app uses codes.)
4. **Give the build your project's address and key.** In the Supabase project, click **Connect** (or open **Project Settings → API Keys**) and copy the **Project URL** and the **publishable key** (the older **anon** key also works). Then in this GitHub repo, go to **Settings → Secrets and variables → Actions → Variables tab → New repository variable** and add:
   - `SUPABASE_URL` = the project URL
   - `SUPABASE_PUBLISHABLE_KEY` = the key

   Both values are designed to be public. Row-level security on the table is what keeps your data private. Re-run the latest CI workflow on `main` (or push anything) to rebuild with sync on.

5. **Sign in on each device** (Sync → enter email → enter code). History already on a device is uploaded on its first sign-in.
6. **Optional, recommended:** after you've signed in once, turn off **Authentication → Sign In / Providers → Allow new users to sign up**, so nobody else can create an account on your project.

Things to know:

- Supabase's built-in email sender only allows a few emails an hour. That's fine for signing in occasionally.
- Free projects are paused after about a week with no activity. If sync starts failing after a break, restore the project from the Supabase dashboard. Practice keeps working offline either way.
- For local development with sync, copy `.env.example` to `.env.local` and fill it in.

## Deploying

`.github/workflows/ci.yml` runs lint, format check, typecheck, tests and build on every push and PR, and deploys `main` to GitHub Pages. One-time setup: **repo Settings → Pages → Source: GitHub Actions**.

## Code map

- `src/data/plans.ts`: the hardcoded practice plans
- `src/domain/`: pure timer maths and the session reducer (all tested)
- `src/storage/`: active session in `localStorage`, history in IndexedDB (Dexie)
- `src/sync/`: sync engine (push local changes, pull server changes, newest change wins) and the Supabase adapter and sign-in
- `supabase/migrations/`: database schema, row-level security, and the newest-change-wins trigger
- `src/screens/`, `src/components/`: React UI
- `src/styles/app.css`: all styling (light/dark via `prefers-color-scheme`)
