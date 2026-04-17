# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (proxies /api to https://toolsmarket.online)
npm run build     # Production build (outputs to dist/)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

## Architecture

**Recharge Station** is a React 19 + Vite app for CDK key activation via the Tools Market API. It uses React Router v7, Tailwind CSS v4, and deploys to GitHub Pages at base path `/z3recharge/`.

### Routing (`src/main.jsx`)

- `/` — Main activation flow (`App.jsx`)
- `/admin/login` — Admin login page
- `/admin` — Protected admin dashboard (wrapped in `ProtectedRoute`)

### Main Flow (`src/App.jsx`)

1. `KeyChecker` — user enters a CDK key → debounced (800ms) `GET https://toolsmarket.online/api/keys/{code}` validates it
2. `SessionInput` — user pastes account session JSON (extracts `user.email` or `email` field)
3. `AccountInfo` — displays email and key details
4. `RechargeButton` — triggers `POST https://toolsmarket.online/api/activate`, then polls `GET https://toolsmarket.online/api/keys/{code}/activation` (20 attempts × 3s)

The main user flow always calls `https://toolsmarket.online` directly via absolute URL — it does **not** use the vite dev proxy.

### Admin System

All admin state is stored entirely in `localStorage` — there is no server-side database.

- **Auth** (`src/utils/auth.js`): Username/password + TOTP 2FA (RFC 6238, compatible with Google Authenticator). Default credentials: `admin` / `z3ra@2024`. Credentials are SHA-256 hashed and stored in `z3ra_admin_auth` localStorage key. Sessions stored under `admin_session` (8-hour expiry). Lockout after 5 failed attempts (5-minute cooldown). Admin keys stored under `admin_keys`. Default admin key hardcoded in `src/utils/keyStore.js` as `DEFAULT_ADMIN_KEY`.
- **Key Linker**: Admins create a `Z3RA-XXXX-XXXX-XXXX` key and link it to a real CDK key from the pool. Links persist under `z3ra_key_links` in localStorage.
- **CDK Key Pool**: The pool of real API keys is hardcoded in `src/utils/keyStore.js` (`CDK_KEY_POOL`). Available vs. linked status is computed at runtime from localStorage.
- **Admin tabs**: Key Linker · Admin Keys · API Tester · Batch Lookup

### API

Dev server proxies `/api/*` → `https://toolsmarket.online` (configured in `vite.config.js`). This proxy is used only by the admin API Tester and Batch Lookup tabs. The main user flow bypasses it and calls the absolute URL directly.

### Styling

Tailwind CSS v4 with custom CSS variables defined in `src/index.css`: dark palette, purple accent, status colors (emerald/rose/amber/sky), and custom animations (`float`, `pulse-glow`, `shimmer`, `slide-up`). Glassmorphism utility class `.glass` is used throughout.

### Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys `dist/` to GitHub Pages on every push to `main`.
