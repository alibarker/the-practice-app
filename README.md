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

## Deploying

`.github/workflows/ci.yml` runs lint, format check, typecheck, tests and build on every push and PR, and deploys `main` to GitHub Pages. One-time setup: **repo Settings → Pages → Source: GitHub Actions**.

## Code map

- `src/data/plans.ts`: the hardcoded practice plans
- `src/domain/`: pure timer maths and the session reducer (all tested)
- `src/storage/`: active session in `localStorage`, history in IndexedDB (Dexie)
- `src/screens/`, `src/components/`: React UI
- `src/styles/app.css`: all styling (light/dark via `prefers-color-scheme`)
