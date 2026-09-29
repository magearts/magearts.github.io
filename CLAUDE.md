# magearts.github.io

Portfolio site of Kritsana Wattanapiphatsakul (MageArts), served at https://magearts.github.io/.

## Stack (decided by the owner — do not swap without asking)

- **Vue 3 + TypeScript**, built with **Vite**, routing with **Vue Router**
- **Preline UI** on **Tailwind CSS v4** (`@tailwindcss/vite`) — no Bootstrap
- **Lucide icons** via `lucide-vue-next`
- **Firebase** as the backend, with realtime data. Realtime Database vs Firestore is **not decided yet**;
  `src/firebase/index.ts` only calls `initializeApp`. Config comes from `VITE_FIREBASE_*` env vars
  (`.env.local` locally, GitHub Actions secrets in CI). Security must come from Firebase rules, not the client.
- **Hosting: GitHub Pages** (user site at root, so no Vite `base`). No Vite server in production.

## Workflow

- Work on a `dev/*` branch → PR into `main`. Never push work-in-progress to `main`: every push to `main` deploys.
- `.github/workflows/ci.yml` type-checks and builds every PR into `main`.
- `.github/workflows/deploy.yml` builds on push to `main` (Node 24), copies `index.html` to `404.html`
  for SPA deep links, and deploys `dist/`.
- `npm run dev` / `npm run preview` listen on the LAN (`server.host` / `preview.host`).

## Preline in Vue

- `import 'preline'` in `src/main.ts`; `router.afterEach` calls `HSStaticMethods.autoInit()` after each render.
- Dark mode is the `.dark` class on `<html>`, set from `prefers-color-scheme` by the inline script in `index.html`.

## Accessibility: WCAG 2.2 Level AA is required

- Text ≥ 4.5:1, large text (≥ 24px, or ≥ 18.66px bold) ≥ 3:1, UI component edges and focus rings ≥ 3:1.
- Visible, unobscured focus (2.4.7, 2.4.11); targets ≥ 24×24px (2.5.8).
- Check contrast before introducing any new color pair; the verified pairs are listed in `src/style.css`.

## Brand and theme (shared with the device firmware)

- Logo source of truth: `/Users/Shared/My Files/MageArts/logo/` (`MageArts-logo-ver1.svg` → `public/logo.svg`).
  Copy from there, not from other repos.
- Theme tokens live in `src/style.css` and must stay in sync with the device firmware UI
  (`/Users/Shared/My Files/MageArts/github/iot/lib/MageArts/web/style.css`). Take values only —
  never import that file (its class names collide with Preline).
- Brand teal `#0082a5` fails AA as body text and under white text: use it only for the logo and large text
  (`text-brand`). Interactive primary is `#006a87` (light) / `#35b4d6` (dark, with `#12181b` text).
