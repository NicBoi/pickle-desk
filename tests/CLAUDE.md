# `tests/` — testing conventions

## Runner

Vitest with happy-dom. Configured in `vitest.config.js`. `npm test`
runs everything once; `npm run test:watch` watches.

## File naming

- `<module>.test.js` — unit tests for `src/logic/<module>.js`.
- `integration.test.js` — end-to-end flows through the UI using
  happy-dom.

## What gets unit-tested vs integration-tested

**Unit (`src/logic/`):**
- Rating delta math (win/loss, margins, edge cases)
- Queue rotation (incl. odd-player handling)
- Duplicate detection (exact, casing, fuzzy near-miss, in-roster
  collision)
- Score validation
- Storage round-trip (with `schemaVersion`)
- Session lifecycle transitions (new → active → archived)

**Integration (happy-dom):**
- Set up a session → play a game → record a score → leaderboard
  updates.
- Same-day resume from `localStorage`.

## Discipline

Red → green → refactor. Always.

1. Write the smallest failing test that captures the next requirement.
2. Implement the simplest code that makes it pass.
3. Refactor with the test still green.
4. Commit. Repeat.

## Test data

Use small, hand-crafted fixtures inline in the test file. No shared
fixture directory — locality beats reuse for a project this size.
