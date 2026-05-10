import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '../src/ui/mount.svelte.js';

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

function setupApp({ now = () => new Date('2026-05-04T19:00:00').getTime() } = {}) {
  document.body.innerHTML = '<main id="app"></main>';
  return mount(document.getElementById('app'), {
    storage: memoryStorage(),
    now,
    idGen: (() => {
      let n = 0;
      return () => `id_${++n}`;
    })(),
  });
}

describe('new-session screen', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the new-session screen with a default name and 3 courts', () => {
    setupApp();
    expect(document.querySelector('[data-screen="new-session"]')).not.toBeNull();
    const nameInput = document.querySelector('[data-field="session-name"]');
    expect(nameInput.value).toMatch(/Mon 4 May/);
    const courts = document.querySelector('[data-field="courts"]');
    expect(courts.value).toBe('3');
  });

  it('adds a new player typed into the input', () => {
    setupApp();
    const input = document.querySelector('[data-field="player-name"]');
    input.value = 'Alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-action="add-player"]').click();

    const roster = document.querySelector('[data-roster]');
    expect(roster.textContent).toContain('Alice');
  });

  it('blocks adding the same name twice in one roster', () => {
    setupApp();
    const input = document.querySelector('[data-field="player-name"]');
    const addBtn = () => document.querySelector('[data-action="add-player"]');

    input.value = 'Alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    addBtn().click();

    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const hint = document.querySelector('[data-hint]');
    expect(hint.dataset.kind).toBe('blocked');
  });

  it('shows a returning-player chip when master has a player not yet in roster', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const storage = memoryStorage();
    storage.setItem(
      'pickledesk_players',
      JSON.stringify({
        schemaVersion: 1,
        data: [
          { id: 'p1', name: 'Bob', hidden: false, createdAt: 1, lastSeen: 2 },
          { id: 'p2', name: 'Carol', hidden: true, createdAt: 1, lastSeen: 2 },
        ],
      }),
    );
    mount(document.getElementById('app'), { storage });

    const chips = document.querySelectorAll('[data-suggestion-chip]');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('Bob');
  });

  it('start button is disabled until minimum players are added', () => {
    setupApp();
    const startBtn = document.querySelector('[data-action="start-session"]');
    expect(startBtn.disabled).toBe(true);

    const input = document.querySelector('[data-field="player-name"]');
    for (const name of ['Alice', 'Bob', 'Carol', 'Dan']) {
      input.value = name;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-action="add-player"]').click();
    }
    expect(document.querySelector('[data-action="start-session"]').disabled).toBe(false);
  });
});

describe('session flow (after start)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function addPlayers(names) {
    const input = document.querySelector('[data-field="player-name"]');
    for (const n of names) {
      input.value = n;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-action="add-player"]').click();
    }
  }

  it('starts a session, fills courts, shows the queue', () => {
    setupApp();
    document.querySelector('[data-field="courts"]').value = '2';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    document.querySelector('[data-action="start-session"]').click();

    expect(document.querySelector('[data-screen="session"]')).not.toBeNull();
    expect(document.querySelectorAll('article[data-court]').length).toBe(2);
    expect(document.querySelectorAll('[data-queue-item]').length).toBe(1);
  });

  it('rotates queue when a court is freed', () => {
    setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    document.querySelector('[data-action="start-session"]').click();

    expect(document.querySelectorAll('[data-queue-item]').length).toBe(4);

    // Record a score for court 0 → frees it, queues losers+winners,
    // and fillCourts auto-refills from the rotated queue.
    const form = document.querySelector('[data-action="record-score"][data-court="0"]');
    form.querySelector('[data-field="score-a"]').value = '11';
    form.querySelector('[data-field="score-b"]').value = '7';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Confirm the pending score
    document.querySelector('[data-action="confirm-round"]').click();

    expect(document.querySelectorAll('[data-queue-item]').length).toBe(4);
    expect(document.querySelector('article[data-court="0"]')).not.toBeNull();
    expect(
      document.querySelector('article[data-court="0"]').textContent,
    ).not.toContain('Waiting for players');
  });

  it('shows a leaderboard tab that updates after a game', () => {
    setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D']);
    document.querySelector('[data-action="start-session"]').click();

    document.querySelector('[data-action="switch-tab"][data-tab="leaderboard"]').click();
    let rows = document.querySelectorAll('[data-leaderboard-row]');
    expect(rows.length).toBe(4);

    // Switch back, record a game, switch forward — leaderboard reflects it.
    document.querySelector('[data-action="switch-tab"][data-tab="courts"]').click();
    const form = document.querySelector('[data-action="record-score"][data-court="0"]');
    form.querySelector('[data-field="score-a"]').value = '11';
    form.querySelector('[data-field="score-b"]').value = '4';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Confirm the pending score
    document.querySelector('[data-action="confirm-round"]').click();

    document.querySelector('[data-action="switch-tab"][data-tab="leaderboard"]').click();
    rows = document.querySelectorAll('[data-leaderboard-row]');
    expect(rows[0].textContent).toMatch(/13\.5/);
  });

  it('adds a player mid-session and they land in the queue', () => {
    setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D']);
    document.querySelector('[data-action="start-session"]').click();

    expect(document.querySelectorAll('[data-queue-item]').length).toBe(0);

    const addForm = document.querySelector('[data-action="add-mid-session"]');
    addForm.querySelector('[data-field="add-player-name"]').value = 'E';
    addForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(document.querySelectorAll('[data-queue-item]').length).toBe(1);
  });

  it('removes a waiting player mid-session', () => {
    setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D', 'E']);
    document.querySelector('[data-action="start-session"]').click();

    expect(document.querySelectorAll('[data-queue-item]').length).toBe(1);

    document
      .querySelector('[data-action="remove-from-session"][data-id="id_5"]')
      .click();

    expect(document.querySelectorAll('[data-queue-item]').length).toBe(0);
    expect(
      document.querySelector('[data-roster-bar-item][data-id="id_5"]'),
    ).toBeNull();
  });

  it('resumes a same-day active session from storage with a banner', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const storage = memoryStorage();
    const today = new Date('2026-05-04T19:00:00').getTime();
    storage.setItem(
      'pickledesk_active_session',
      JSON.stringify({
        schemaVersion: 1,
        data: {
          id: 's-old',
          name: 'Earlier today',
          createdAt: new Date('2026-05-04T08:00:00').getTime(),
          updatedAt: today,
          courtCount: 1,
          players: [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
            { id: 'p3', name: 'Carol' },
            { id: 'p4', name: 'Dan' },
          ],
          courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
          queue: [],
          games: [],
          playerStats: {},
        },
      }),
    );
    mount(document.getElementById('app'), { storage, now: () => today });
    expect(document.querySelector('[data-screen="session"]')).not.toBeNull();
    expect(document.querySelector('[data-banner="resume"]')).not.toBeNull();
  });

  it('prompts on cross-day active session', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const storage = memoryStorage();
    const today = new Date('2026-05-04T08:00:00').getTime();
    const yesterday = new Date('2026-05-03T20:00:00').getTime();
    storage.setItem(
      'pickledesk_active_session',
      JSON.stringify({
        schemaVersion: 1,
        data: {
          id: 's-yesterday',
          name: 'Last night',
          createdAt: yesterday,
          updatedAt: yesterday,
          courtCount: 1,
          players: [{ id: 'p1', name: 'A' }],
          courts: [null],
          queue: ['p1'],
          games: [],
          playerStats: {},
        },
      }),
    );
    mount(document.getElementById('app'), { storage, now: () => today });
    expect(document.querySelector('[data-screen="resume-prompt"]')).not.toBeNull();

    document.querySelector('[data-action="archive-session"]').click();
    expect(document.querySelector('[data-screen="new-session"]')).not.toBeNull();
  });

  it('manual new-session button archives and returns to new-session', () => {
    const ctx = setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D']);
    document.querySelector('[data-action="start-session"]').click();

    document.querySelector('[data-action="new-session"]').click();
    expect(document.querySelector('[data-screen="new-session"]')).not.toBeNull();
    expect(ctx.state.activeSession).toBeNull();
    expect(ctx.state.sessions.length).toBe(1);
  });

  it('renames the session inline from the session screen', () => {
    const ctx = setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D']);
    document.querySelector('[data-action="start-session"]').click();

    document.querySelector('[data-field="session-name"]').click();
    const renameInput = document.querySelector('[data-field="rename-session"]');
    expect(renameInput).not.toBeNull();
    renameInput.value = 'Friday Night';
    renameInput.dispatchEvent(new Event('blur'));

    expect(ctx.state.activeSession.name).toBe('Friday Night');
    expect(
      document.querySelector('[data-field="session-name"]').textContent,
    ).toBe('Friday Night');
  });

  it('hides a returning player and restores them via Manage Players', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const storage = memoryStorage();
    storage.setItem(
      'pickledesk_players',
      JSON.stringify({
        schemaVersion: 1,
        data: [
          { id: 'p1', name: 'Bob', hidden: false, createdAt: 1, lastSeen: 2 },
        ],
      }),
    );
    const ctx = mount(document.getElementById('app'), { storage });

    expect(document.querySelectorAll('[data-suggestion-chip]').length).toBe(1);
    document.querySelector('[data-action="hide-player"][data-id="p1"]').click();
    expect(document.querySelectorAll('[data-suggestion-chip]').length).toBe(0);
    expect(ctx.state.master[0].hidden).toBe(true);

    document.querySelector('[data-action="restore-player"][data-id="p1"]').click();
    expect(document.querySelectorAll('[data-suggestion-chip]').length).toBe(1);
    expect(ctx.state.master[0].hidden).toBe(false);
  });

  it('archives a session, lists it in history, and shows detail', () => {
    setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D']);
    document.querySelector('[data-action="start-session"]').click();

    // Record one game so the archived session has data.
    const form = document.querySelector('[data-action="record-score"][data-court="0"]');
    form.querySelector('[data-field="score-a"]').value = '11';
    form.querySelector('[data-field="score-b"]').value = '4';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Confirm the pending score
    document.querySelector('[data-action="confirm-round"]').click();

    // Archive via "End & start new", then open history from new-session.
    document.querySelector('[data-action="new-session"]').click();
    document.querySelector('[data-action="open-history"]').click();

    const rows = document.querySelectorAll('[data-history-row]');
    expect(rows.length).toBe(1);

    document.querySelector('[data-action="view-session"]').click();
    expect(document.querySelector('[data-zone="history-detail"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-game]').length).toBe(1);
    expect(document.querySelectorAll('[data-leaderboard-row]').length).toBe(4);
  });

  it('persists a recorded game and updates playerStats', () => {
    const ctx = setupApp();
    document.querySelector('[data-field="courts"]').value = '1';
    document.querySelector('[data-field="courts"]').dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    addPlayers(['A', 'B', 'C', 'D']);
    document.querySelector('[data-action="start-session"]').click();

    const form = document.querySelector('[data-action="record-score"][data-court="0"]');
    form.querySelector('[data-field="score-a"]').value = '11';
    form.querySelector('[data-field="score-b"]').value = '4';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Confirm the pending score
    document.querySelector('[data-action="confirm-round"]').click();

    const session = ctx.state.activeSession;
    expect(session.games.length).toBe(1);
    expect(session.games[0].scoreA).toBe(11);
    expect(session.games[0].scoreB).toBe(4);
    // Winners (team A) get +13.5 each, losers (team B) get +6.5 each
    const ratings = Object.values(session.playerStats)
      .map((s) => s.rating)
      .sort((a, b) => a - b);
    expect(ratings).toEqual([6.5, 6.5, 13.5, 13.5]);
  });
});
