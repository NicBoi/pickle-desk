# Contributing to PickleDesk

Welcome — and thanks for your interest.

## Running locally

```
npm install
npm test
```

Open `index.html` in a browser to run the app, or serve the repo with any
static file server (`npx serve`, `python -m http.server`, etc).

## Architecture in one paragraph

Pure logic lives in `src/logic/` and never touches the DOM or
`localStorage` directly — storage is passed in as a dependency. UI lives
in `src/ui/` and renders from state plus dispatches events back into
logic. This split is what makes the codebase trivially testable.

## TDD discipline (binding)

Every behaviour change goes through red → green → refactor:

1. Write the smallest failing test that captures the next requirement.
2. Implement the simplest code that makes it pass.
3. Refactor with the test still green.
4. Commit. Repeat.

When asked to implement a feature, split it into TDD-sized steps before
writing any production code, list them, then execute one cycle at a
time. No "implement now, test later."

## CLAUDE.md upkeep (binding)

When a change alters a module's public API, responsibility, or an
architectural rule, the relevant `CLAUDE.md` is updated **in the same
PR**. The PR template has a checkbox for this. Stale `CLAUDE.md` is
worse than none.

## Pull requests

- Branch from `main`.
- Keep PRs focused — one feature or fix per PR.
- Run `npm test` locally before opening the PR.
- Fill in the PR template (tests added/updated, CLAUDE.md updated if
  applicable, ran locally).
- CI must be green before merge.

## Code of conduct

Participation is governed by `CODE_OF_CONDUCT.md`.
