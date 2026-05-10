# `src/ui/` — Svelte components and event flow

UI lives here. Components read state and render; events from the DOM
call into `src/logic/` and the result triggers re-render via Svelte's
reactivity. Logic never imports from this directory.

## Stack

- **Svelte 5 (runes mode).** Components use `$state`, `$derived`,
  `$effect`. No stores unless we hit a clear cross-component need.
- **Vite** bundles components for both dev (`npm run dev`) and prod
  (`npm run build` → `dist/`).

## Layout

- `app.js` — Vite entry. Mounts the root Svelte component into
  `#app`, injects the storage adapter and any test seams.
- `mount.js` — builds the initial app context (master player list,
  active session, screen routing) and exposes a `mount(target, opts)`
  helper so tests can inject a memory storage, fixed clock, and
  deterministic id generator. The vanilla DOM screens listed below
  predate the Svelte migration and are being replaced phase by phase.
- `dom.js` — small DOM helpers used by the legacy vanilla screens.
  Will be deleted once every screen is `.svelte`.
- `screens/` — one file per screen. Existing `.js` files are the
  vanilla legacy version; new screens land as `.svelte`.

## Migration status (in progress)

The plan is to replace each vanilla screen with a Svelte component
phase by phase, per `plan.md`. Until a screen is ported, the legacy
`.js` version is wired through `mount.js`. Once all screens are
Svelte, `dom.js` and the routing dispatcher in `mount.js` get deleted.

## Event flow

```
DOM event
  → handler in <Screen>.svelte
  → call into src/logic/<module>.js (pure)
  → write result via src/logic/storage.js
  → Svelte re-renders from updated $state
```

If you find yourself reaching for the DOM inside `src/logic/`, stop.
Lift the impure bit up into the UI layer.
