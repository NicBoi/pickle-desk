## PickleDesk — Full Plan

---

### Project Identity

- **Name:** PickleDesk
- **Repo:** `pickle-desk`
- **Tagline:** *Your club's pickleball session manager*
- **Stack:** HTML + ES modules + CSS, zero runtime dependencies (Vitest/happy-dom are devDependencies only), GitHub Pages ready
- **License:** MIT

---

### Folder Structure

```
pickle-desk/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── src/
│   ├── logic/
│   │   ├── rating.js
│   │   ├── queue.js
│   │   ├── duplicates.js
│   │   ├── storage.js
│   │   ├── session.js
│   │   └── CLAUDE.md
│   ├── ui/
│   │   ├── render.js
│   │   ├── screens/
│   │   └── CLAUDE.md
│   └── app.js
├── tests/
│   ├── rating.test.js
│   ├── queue.test.js
│   ├── duplicates.test.js
│   ├── storage.test.js
│   ├── session.test.js
│   ├── integration.test.js
│   └── CLAUDE.md
├── index.html
├── style.css
├── package.json
├── vitest.config.js
├── CLAUDE.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE
├── README.md
└── plan.md
```

**Module loading:** `index.html` loads `src/app.js` via `<script type="module">`. Native ES modules — no bundler, GitHub Pages serves the repo as-is.

**Dependency rule:** zero *runtime* dependencies. Test tooling (Vitest, happy-dom) lives only in `devDependencies` and never ships to Pages.

---

### Data Model (localStorage)

```
pickledesk_players        → master list of all known players (name, id, hidden flag)
pickledesk_sessions       → array of all past sessions
pickledesk_active_session → the current in-progress session (if any)
```

**Session object:**
```
{
  id, name, date, courts,
  players: [...],       ← active roster for this session
  queue: [...],         ← ordered waiting list
  courts: [...],        ← per-court state
  games: [...],         ← completed game log
  createdAt, updatedAt
}
```

**Player object (master list):**
```
{
  id, name, hidden,     ← hidden = organiser soft-deleted them from suggestions
  createdAt, lastSeen
}
```

**Per-game record:**
```
{
  id, sessionId, court,
  teamA: [playerId, playerId], scoreA,
  teamB: [playerId, playerId], scoreB,
  timestamp
}
```

---

### Player Suggestion System (New Session Screen)

This is the smart onboarding step:

1. App loads the **master player list** from localStorage
2. Shows two areas:

**"Quick Add — Returning Players"**
- Chips/badges, one per known player, sorted by most recently seen
- Players marked `hidden` don't appear
- Tap a chip → player is added to today's roster (chip becomes highlighted)
- Each chip has a small ✏️ edit icon and a 🗑️ hide icon inline

**"Add New Player"**
- Text input → as you type, fuzzy-matches against known names and warns if a near-duplicate exists
- If the exact name already exists in today's roster → red flag, blocked
- If similar name exists → yellow warning ("Did you mean Jamie? Add anyway?")
- Confirm → adds to roster AND saves to master list

**Editing a suggestion:**
- Tap ✏️ on a chip → inline edit of the name in the master list
- Change propagates: if that player is already in today's roster, name updates there too
- If the edited name now clashes with another → flagged

**Hiding a suggestion:**
- Tap 🗑️ on a chip → player is soft-deleted (hidden flag = true)
- They no longer appear in suggestions
- Their historical game data is preserved
- A "Manage Players" section at the bottom of setup lets you restore hidden players

---

### Duplicate Detection Rules

| Situation | Behaviour |
|---|---|
| Exact name match, already in today's roster | Blocked — red error |
| Exact name match, not yet in roster | Allowed — it's a returning player |
| Same name as master list but different casing | Treated as same, normalised |
| Similar name (e.g. "Jon" vs "John") | Yellow warning, organiser decides |
| Two players genuinely share a name | Organiser must disambiguate (e.g. "Jamie B" vs "Jamie T") |

---

### Session Setup Screen — Full Flow

1. **Session name** — auto-filled as `Mon 5 May · 7:00 PM`, editable inline
2. **Number of courts** — number input, default 3
3. **Returning players** — chip grid (quick add)
4. **Add new player** — text field with live duplicate check
5. **Today's roster** — live list of added players, each removable
6. **Start Session** button — enabled when at least 8 players added (or configurable minimum)

---

### Main Session View

**Three panels:**

**Courts** (top)
- One card per court
- Shows Team A vs Team B with player names
- "Record Score" button per court
- If court is idle (waiting for players) → shows "Waiting for players…"

**Queue** (middle)
- Ordered list: "Next up: Jamie, Priya, Tom, Leo"
- Then the rest in order
- If odd number → note at bottom: "1 player sitting out this round"

**Roster bar** (bottom or side menu)
- All session players with status: Playing / Waiting / Sitting out
- Add player button
- Tap a player → options: Remove from session / Mark as left

---

### Game Assignment Logic

When a court finishes and score is recorded:

1. Losers (and optionally winners based on club preference — configurable) go to **back of queue**
2. Next 4 from **front of queue** are assigned to the now-free court
3. If fewer than 4 in queue → court stays idle until enough players free up
4. Odd-number handling: the queue naturally handles it — someone always waits one extra rotation

**Team formation within the 4 assigned players:**
- Option A: Random split (default)
- Option B: Organiser manually picks teams from the 4
- This is a setting per session

---

### Score Entry & Rating

**Input:** Team A score and Team B score (e.g. 11 and 7)

**Individual rating delta formula:**
```
margin = your_team_score - opponent_team_score
delta = 10 + (margin × 0.5)
```

Examples:
- Win 11–4 (margin +7): **+13.5 pts**
- Win 11–9 (margin +2): **+11 pts**
- Loss 9–11 (margin -2): **+9 pts**
- Loss 4–11 (margin -7): **+6.5 pts**

Everyone earns points for playing. Winners earn more. Close losses are protected. Blowout losses earn least.

---

### Leaderboard

- Columns: Rank, Name, Played, Wins, Losses, Win %, Rating
- Default sort: Rating (descending)
- Tap column header to re-sort
- Updates live after every game recorded
- Visible as a tab during the session, not just at the end

---

### Mid-Session Player Management

| Action | Behaviour |
|---|---|
| Add player | Added to back of queue immediately |
| Remove player (waiting) | Removed from queue, session stats preserved |
| Remove player (playing) | Flagged — organiser confirms, court marked as interrupted |
| Player returns | Re-added to back of queue |

---

### Session Lifecycle & localStorage Logic

**On app open:**
```
1. Check pickledesk_active_session
2. If exists AND same calendar day → resume, show "Resuming [session name]" banner
3. If exists AND different day → prompt: "You have an unfinished session from [date]. Resume or archive it?"
4. If none → go to New Session setup
```

**New session always:**
- Archives the previous session to `pickledesk_sessions`
- Clears `pickledesk_active_session`
- Updates `lastSeen` on all master players who participated

**Manual "New Session" button** always available from the menu, with a confirmation step.

---

### History View

- Accessible from hamburger/menu icon
- List of past sessions: name, date, number of players, number of games
- Tap → session detail: game log + final leaderboard
- Sessions never auto-deleted
- "Clear history" option buried in settings with a confirmation

---

### Rename Session

- Tap the session name anywhere in the header → inline edit
- Works at setup time and at any point mid-session
- Useful for naming club nights, friendly matches, tournaments

---

### README Outline

1. What PickleDesk is — one-line tagline + 2-sentence pitch
2. Live demo link (GitHub Pages URL)
3. Features (bulleted)
4. Screenshots (add once UI is built)
5. How to use — setup a session, play, score, manage players
6. Self-hosting — fork + enable GitHub Pages (3 steps), or any static host
7. Local development — `npm install`, `npm test`, opening `index.html`
8. Contributing — link to `CONTRIBUTING.md`, mention TDD rule
9. License (MIT) — link to `LICENSE`

---

### Documentation Strategy (CLAUDE.md files)

CLAUDE.md files are living documentation that AI assistants and contributors read on entry. They describe how the code is organised so future changes stay coherent without re-deriving structure from a full read.

- **Root `CLAUDE.md`** — project purpose, how to run locally, how to run tests, key architectural rules (pure logic vs DOM split, ESM modules, zero runtime deps, TDD discipline), pointer to each area's CLAUDE.md.
- **`src/logic/CLAUDE.md`** — covers pure-function modules. Lists each module's responsibility, public API, and invariants. No DOM here, ever.
- **`src/ui/CLAUDE.md`** — covers DOM rendering and event handlers. Notes which screen renders from which slice of state and how events flow back into logic.
- **`tests/CLAUDE.md`** — testing conventions: file naming, what gets unit-tested vs integration-tested, the red-green-refactor rule.

**Upkeep rule (binding):** when an implementation change alters a module's public API, responsibility, or an architectural rule, the relevant CLAUDE.md is updated *in the same PR*. Stale CLAUDE.md is worse than none. PR template includes a checkbox for this.

---

### Testing Strategy (TDD)

- **Runner:** Vitest (devDependency).
- **DOM:** happy-dom for the integration tests; pure logic stays runtime-free and trivially testable.
- **Discipline (red → green → refactor):**
  1. Write the smallest failing test that captures the next requirement.
  2. Implement the simplest code that makes it pass.
  3. Refactor with the test still green.
  4. Commit. Repeat.
- **When prompted to implement a feature:** split it into logical TDD-sized steps before writing code, list them, then execute one cycle at a time. No "implement now, test later."
- **Architecture for testability:** pure functions in `src/logic/` (no DOM, no `localStorage` access — storage is passed in). DOM and storage live behind thin adapters in `src/ui/` and `src/logic/storage.js`.
- **What is unit-tested:** rating delta math, queue rotation (incl. odd-player edge cases), duplicate detection (exact/casing/fuzzy), score validation, storage round-trip, session lifecycle transitions (new → active → archived).
- **What is integration-tested:** end-to-end "set up session → play game → record score → leaderboard updates" via happy-dom.
- **Coverage:** not a target on its own, but every pure function in `src/logic/` should have direct tests.

---

### Open Source Setup

- **`LICENSE`** — MIT, top-level.
- **`README.md`** — outline above.
- **`CONTRIBUTING.md`** — how to run, how to test, the TDD rule for new features, the CLAUDE.md upkeep rule, PR conventions.
- **`CODE_OF_CONDUCT.md`** — Contributor Covenant.
- **`.github/ISSUE_TEMPLATE/`** — `bug_report.md` and `feature_request.md`.
- **`.github/PULL_REQUEST_TEMPLATE.md`** — checklist: tests added/updated, CLAUDE.md updated if applicable, ran locally.
- **`package.json`** — `name`, `version`, `description`, `repository`, `license: MIT`, `scripts.test: vitest`, `devDependencies` only.

---

### Deployment (GitHub Pages + CI)

- **Hosting:** GitHub Pages, served from `main` branch root. `index.html` loads ES modules from `src/`. **No build step.**
- **URL:** `https://<github-user>.github.io/pickle-desk/`.
- **CI** (`.github/workflows/ci.yml`): on push and PR — `npm ci` → `npm test`. PR merges blocked on red.
- **Pages workflow:** unnecessary while there is no build step. If a bundler is added later, switch to a Pages action that publishes `dist/`.
- **Storage versioning (future-proofing):** every `localStorage` key carries a `schemaVersion` field; migrations live in `src/logic/storage.js` and are tested. Out-of-scope for v1 but the field ships in v1 to avoid a painful retrofit.

---

### Build Order (TDD per phase)

Each phase: list logical sub-steps → write failing test → implement → refactor → update CLAUDE.md if APIs/rules changed → commit. Phases ship incrementally; every phase ends with a working app on `main`.

| Phase | Tests first | Then implementation |
|---|---|---|
| 0 | (scaffold) | `package.json`, Vitest + happy-dom, CI workflow, LICENSE, root + `tests/` CLAUDE.md, README skeleton, empty `index.html` loading `src/app.js` |
| 1 | Storage round-trip; player name normalisation; schemaVersion stamping | `src/logic/storage.js` + master player list module |
| 2 | Duplicate detection: exact match, casing, fuzzy near-miss, in-roster collision | New-session screen with chip grid + add-player input |
| 3 | Queue rotation; court assignment; odd-player handling; team formation (random + manual) | Courts + queue UI |
| 4 | Rating delta math (win/loss/margins); score validation (non-negative, win-by margins if configured) | Score entry UI + rating updates wired to player records |
| 5 | Leaderboard sort + live recompute on game record | Leaderboard tab |
| 6 | Mid-session add/remove transitions; interrupted-court flow | Player management UI |
| 7 | Same-day resume; cross-day archive prompt; manual new-session confirmation | Lifecycle UI + banners |
| 8 | History query (list + detail); past-session integrity | History view |
| 9 | — | Polish, accessibility pass (keyboard nav, ARIA, contrast), screenshots, README features section |

---