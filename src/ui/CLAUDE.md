# `src/ui/` — DOM and event flow

DOM rendering and event handlers live here. UI reads state and renders;
events from the DOM call into `src/logic/` and the result is rendered
again. Logic never imports from this directory.

## Layout

- `mount.js` — entry point. Loads master player list from storage,
  builds initial state, picks the active screen, and renders. Exposes
  a `mount(root, opts)` function so tests can inject a memory storage,
  a fixed clock, and a deterministic id generator.
- `dom.js` — tiny DOM helpers (`el(tag, attrs, text)`, `clear(node)`).
  No framework, no templating — just a pinch of sugar.
- `screens/new-session.js` — new-session setup. Stable skeleton; the
  suggestions, hidden-players, hint, and roster zones re-render in
  place so the input keeps focus.
- `screens/session.js` — active session: header (rename + nav), tabs
  (courts / leaderboard), queue, and roster bar (mid-session add +
  remove with confirmation when a playing player is removed). Every
  zone here is rebuilt by `refresh()` so a rename or banner change
  shows up everywhere.
- `screens/resume-prompt.js` — cross-day prompt. Two choices: resume
  the unfinished session, or archive it and start fresh.
- `screens/history.js` — list of archived sessions and a per-session
  detail view (final leaderboard + game log).

## Event flow

```
DOM event
  → handler in src/ui/screens/<screen>.js
  → call into src/logic/<module>.js (pure)
  → write result via src/logic/storage.js
  → re-render
```

If you find yourself reaching for the DOM inside `src/logic/`, stop.
Lift the impure bit up into the UI layer.
