# PickleDesk — root guide

PickleDesk is a static web app that helps a club run a pickleball
session: setup, courts, queue, scoring, ratings, leaderboard, history.
State lives in `localStorage`. No server. No accounts.

## How to run

```
npm install      # install deps (Vite, Svelte, Vitest, happy-dom)
npm run dev      # local dev server with HMR
npm run build    # build static assets to dist/
npm run preview  # serve the built dist/ locally
npm test         # run the test suite once
npm run test:watch
```

## Architectural rules (binding)

1. **Pure logic vs UI split.** `src/logic/` is pure JavaScript — no DOM
   access, no `localStorage` access. Storage and DOM live behind thin
   adapters in `src/ui/` and `src/logic/storage.js`. Logic functions
   take state in and return new state out.
2. **Svelte 5 + Vite.** `index.html` is the Vite entry. UI components
   are Svelte 5 (runes mode). The build outputs static HTML/CSS/JS to
   `dist/`, which is what GitHub Pages serves.
3. **TDD discipline.** Red → green → refactor. Every behaviour change
   in `src/logic/` starts with a failing test. See `CONTRIBUTING.md`.
4. **Storage versioning.** Every `localStorage` payload carries a
   `schemaVersion` field. Migrations live in `src/logic/storage.js`.
5. **Logic stays framework-agnostic.** `src/logic/` never imports from
   Svelte or any UI library. This keeps tests fast (plain Vitest, no
   component runtime) and lets us swap the UI layer without rewriting
   game logic.

## Layout

```
src/
  logic/        ← pure functions, unit-tested with Vitest
  ui/           ← Svelte components + the shared mount/state layer
  app.js        ← Vite entry, mounts the root Svelte component
tests/          ← Vitest suites (unit + integration)
index.html      ← Vite entry HTML
vite.config.js  ← Vite + Vitest config
```

See:
- `src/logic/CLAUDE.md` — pure-logic modules and their public API
- `src/ui/CLAUDE.md` — Svelte component layout and event flow
- `tests/CLAUDE.md` — testing conventions

## Deployment

`main` branch pushes trigger `.github/workflows/deploy.yml`, which runs
`npm run build` and publishes `dist/` to GitHub Pages. The Vite `base`
is `/pickle-desk/` in production, so URLs work under
`https://<owner>.github.io/pickle-desk/`.

## CLAUDE.md upkeep (binding)

When a change alters a module's public API, responsibility, or one of
the architectural rules above, update the relevant `CLAUDE.md` in the
same PR. Stale `CLAUDE.md` is worse than none.
