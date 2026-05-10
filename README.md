# PickleDesk

> Your club's pickleball session manager.

PickleDesk is a static web app (Svelte 5 + Vite) that runs entirely in
the browser. Set up a session, add players, and PickleDesk handles the
queue, courts, scores, ratings, and leaderboard. Data lives in
`localStorage` — no server, no accounts.

## Status

End-to-end working. See `plan.md` for the original roadmap.

## Live demo

_Coming soon — once GitHub Pages is wired up._

## Features

- New-session setup with returning-player chips, fuzzy duplicate
  detection, and a Manage Players section for hidden names.
- Court + queue rotation with auto-fill, odd-player handling, and
  sit-out indication.
- Score entry per court with margin-aware rating deltas
  (`10 + margin × 0.5`).
- Live leaderboard tab — sortable columns, recomputes after each game.
- Mid-session add/remove (with confirmation when removing a playing
  player; the court is freed and the other three return to the queue).
- Same-day resume with banner, cross-day prompt to resume or archive.
- History view: list of past sessions with final leaderboard and
  per-game log.
- Inline session rename, edit/hide on suggestion chips, restore from
  Manage Players.

## Self-hosting

PickleDesk builds to a static `dist/` folder. Fork the repo, set GitHub
Pages source to "GitHub Actions" in repo settings, and push to `main` —
the included workflow builds with Vite and publishes to
`https://<your-user>.github.io/pickle-desk/`. Any static host works for
the built `dist/` output.

## Local development

```
npm install
npm run dev        # local dev server with HMR
npm run build      # build static assets to dist/
npm run preview    # serve the built dist/ locally
npm test           # run the test suite
```

## Contributing

See `CONTRIBUTING.md`. New features follow a strict TDD cycle (red →
green → refactor) and the relevant `CLAUDE.md` is updated in the same PR
when public APIs or architectural rules change.

## License

MIT — see `LICENSE`.
