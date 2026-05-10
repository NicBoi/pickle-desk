# `src/logic/` — pure logic

Pure functions. **No DOM. No `localStorage` access.** Storage is passed
in as an argument when needed (see `storage.js` for the adapter shape).

## Modules

_(Each module is added in its TDD phase. This file is updated in the
same PR as the module lands.)_

- `storage.js` — adapter around a Storage-like object (real
  `localStorage` in the app, in-memory Map in tests). Wraps every
  payload as `{ schemaVersion, data }`; reads return `null` for absent,
  malformed, or unknown-version values.
  **Public API:** `read(storage, key)`, `write(storage, key, data)`,
  `KEYS`, `SCHEMA_VERSION`.
- `players.js` — master player list operations.
  **Public API:** `normaliseName(name)`, `createPlayer(name, opts?)`,
  `addToMaster(list, player)`. Names are kept in two forms — display
  (trimmed) and normalised (lowercased, whitespace collapsed) — and
  comparisons always use the normalised form.
- `rating.js` — rating math + game recording.
  **Public API:** `ratingDelta(your, opp)` (= 10 + margin × 0.5),
  `validateScore(a, b)` (non-negative ints, no ties),
  `recordGame(session, courtIndex, scoreA, scoreB, opts)` which
  appends to `session.games`, frees the court, queues losers ahead of
  winners, and updates `session.playerStats[id]` =
  `{ played, wins, losses, rating }`.
- `queue.js` — queue rotation, court assignment, team formation.
  **Public API:** `assignTeams(four, rng)`,
  `startSession(draft, opts)`, `fillCourts(session, opts)`,
  `fillCourtsSmartly(session, opts)`, `freeCourt(session, courtIndex)`,
  `substitutePlayer(session, courtIndex, playerIdToRemove, playerIdToAdd)`,
  `buildPairingHistory(games)`.
  Court state is `null` (idle) or `{ teamA, teamB }` where each team is
  a 2-tuple of player ids; the queue stores ids only and renderers look
  up names from `session.players`. `fillCourtsSmartly` uses game history
  to minimize repeated team partnerships. `buildPairingHistory` derives
  a partnership-frequency map from `session.games`. Substitution swaps a
  player on court with one from the queue, returning null if either is
  invalid.
- `duplicates.js` — duplicate detection.
  **Public API:** `findExactMatch(name, players)`,
  `findSimilar(name, players)`,
  `classifyAdd(input, master, roster)` returning one of `{ kind:
  'invalid' | 'blocked' | 'returning' | 'similar' | 'new', ... }`.
  Hidden players are still matched (UI decides whether to surface
  them); the similarity threshold scales with the shorter name's
  length to avoid flagging short noise.
- `session.js` — mid-session player transitions and lifecycle.
  **Public API:** `addPlayerToSession(session, player)`,
  `removeSessionPlayer(session, playerId)` (frees the court if the
  removed player was playing and queues the other three),
  `archiveSession(state, opts?)` (moves `state.activeSession` to
  `state.sessions` and bumps `lastSeen` on participating master
  players), `isSameDay(a, b)` (used by mount to decide between
  resume and the cross-day prompt).
- `leaderboard.js` — projects a session into a sorted leaderboard.
  **Public API:** `buildLeaderboard(session, sortBy = 'rating')`
  returning rows of `{ id, name, rank, played, wins, losses, winPct,
  rating }`. Supported sort keys: `rating`, `wins`, `losses`,
  `played`, `winPct`, `name`.

## Invariants

- Functions return new state; they do not mutate inputs.
- Names are normalised (trimmed, case-folded for comparison) before
  any equality check.
- Player identity is by `id`, not by name. Names can change.
