# PickleDesk — root guide

PickleDesk is a static, dependency-free web app that helps a club run a
pickleball session: setup, courts, queue, scoring, ratings, leaderboard,
history. State lives in `localStorage`. No server. No accounts.

## How to run

```
npm install      # install Vitest + happy-dom (devDeps only)
npm test         # run the test suite once
npm run test:watch
```

To run the app locally, open `index.html` in a browser, or serve the
repo with any static file server (`npx serve`).

## Architectural rules (binding)

1. **Pure logic vs DOM split.** `src/logic/` is pure JavaScript — no DOM
   access, no `localStorage` access. Storage and DOM live behind thin
   adapters in `src/ui/` and `src/logic/storage.js`. Logic functions
   take state in and return new state out.
2. **ES modules, no bundler.** `index.html` loads `src/app.js` via
   `<script type="module">`. GitHub Pages serves the repo as-is.
3. **Zero runtime dependencies.** Vitest and happy-dom live in
   `devDependencies` only. Anything that ships to Pages runs on the
   browser's standard library.
4. **TDD discipline.** Red → green → refactor. Every behaviour change
   starts with a failing test. See `CONTRIBUTING.md`.
5. **Storage versioning.** Every `localStorage` payload carries a
   `schemaVersion` field. Migrations live in `src/logic/storage.js`.

## Layout

```
src/
  logic/        ← pure functions, unit-tested
  ui/           ← DOM rendering + event handlers
  app.js        ← entry point, wires UI to logic
tests/          ← Vitest suites (unit + integration)
```

See:
- `src/logic/CLAUDE.md` — pure-logic modules and their public API
- `src/ui/CLAUDE.md` — DOM rendering and event flow
- `tests/CLAUDE.md` — testing conventions

## CLAUDE.md upkeep (binding)

When a change alters a module's public API, responsibility, or one of
the architectural rules above, update the relevant `CLAUDE.md` in the
same PR. Stale `CLAUDE.md` is worse than none.
