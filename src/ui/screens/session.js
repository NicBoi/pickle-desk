// Session screen — header (rename + nav), tabs (courts / leaderboard),
// queue, roster bar with mid-session add/remove. The header zone, like
// every other zone here, is rebuilt on each refresh so a rename or
// banner change shows up everywhere it needs to.

import { fillCourts } from '../../logic/queue.js';
import { recordGame, validateScore } from '../../logic/rating.js';
import { buildLeaderboard } from '../../logic/leaderboard.js';
import {
  addPlayerToSession,
  removeSessionPlayer,
  archiveSession,
} from '../../logic/session.js';
import { createPlayer, addToMaster } from '../../logic/players.js';
import { findExactMatch } from '../../logic/duplicates.js';
import { el, clear } from '../dom.js';

export function renderSession(root, ctx) {
  clear(root);
  const screen = el('section', { 'data-screen': 'session' });

  const header = el('header');
  screen.appendChild(header);

  const tabsNav = el('nav', { 'data-zone': 'tabs' });
  screen.appendChild(tabsNav);

  const courtsZone = el('section', { 'data-zone': 'courts' });
  screen.appendChild(courtsZone);

  const queueZone = el('section', { 'data-zone': 'queue' });
  screen.appendChild(queueZone);

  const leaderboardZone = el('section', { 'data-zone': 'leaderboard' });
  screen.appendChild(leaderboardZone);

  const rosterBar = el('section', { 'data-zone': 'roster-bar' });
  screen.appendChild(rosterBar);

  let activeTab = 'courts';
  let leaderboardSort = 'rating';

  function setTab(name) {
    activeTab = name;
    refresh();
  }

  function refresh() {
    renderHeader();
    renderTabs();
    if (activeTab === 'courts') {
      courtsZone.hidden = false;
      queueZone.hidden = false;
      leaderboardZone.hidden = true;
      renderCourts();
      renderQueue();
    } else {
      courtsZone.hidden = true;
      queueZone.hidden = true;
      leaderboardZone.hidden = false;
      renderLeaderboard();
    }
    renderRosterBar();
  }

  function renderHeader() {
    clear(header);
    const title = el(
      'h1',
      {
        'data-field': 'session-name',
        tabindex: '0',
        role: 'button',
        'aria-label': 'Rename session',
      },
      ctx.state.activeSession.name,
    );
    title.addEventListener('click', () => startRename(title));
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startRename(title);
      }
    });
    header.appendChild(title);

    if (ctx.state.resumed) {
      header.appendChild(
        el(
          'p',
          { 'data-banner': 'resume' },
          `Resuming ${ctx.state.activeSession.name}.`,
        ),
      );
    }

    const newBtn = el(
      'button',
      { 'data-action': 'new-session', type: 'button' },
      'End & start new',
    );
    newBtn.addEventListener('click', () => {
      const ok = globalThis.confirm
        ? globalThis.confirm('End and archive this session?')
        : true;
      if (!ok) return;
      Object.assign(ctx.state, archiveSession(ctx.state, { now: ctx.now }));
      ctx.state.resumed = false;
      ctx.state.draft = {
        name: '', courts: 3, roster: [], input: '', hint: { kind: 'idle' },
      };
      ctx.transition('new-session');
    });
    header.appendChild(newBtn);

    const historyBtn = el(
      'button',
      { 'data-action': 'open-history', type: 'button' },
      'History',
    );
    historyBtn.addEventListener('click', () => {
      ctx.state.viewingSessionId = null;
      ctx.transition('history');
    });
    header.appendChild(historyBtn);
  }

  function startRename(titleNode) {
    const input = el('input', {
      type: 'text',
      'data-field': 'rename-session',
      value: ctx.state.activeSession.name,
      'aria-label': 'Session name',
    });
    function commit() {
      const next = input.value.trim();
      if (next && next !== ctx.state.activeSession.name) {
        ctx.state.activeSession = {
          ...ctx.state.activeSession,
          name: next,
          updatedAt: ctx.now(),
        };
        ctx.persist();
      }
      refresh();
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        refresh();
      }
    });
    input.addEventListener('blur', commit);
    titleNode.replaceWith(input);
    input.focus();
    if (typeof input.select === 'function') input.select();
  }

  function renderTabs() {
    clear(tabsNav);
    for (const [key, label] of [['courts', 'Courts'], ['leaderboard', 'Leaderboard']]) {
      const btn = el(
        'button',
        {
          'data-action': 'switch-tab',
          'data-tab': key,
          'data-active': key === activeTab ? 'true' : 'false',
          type: 'button',
        },
        label,
      );
      btn.addEventListener('click', () => setTab(key));
      tabsNav.appendChild(btn);
    }
  }

  function renderLeaderboard() {
    clear(leaderboardZone);
    leaderboardZone.appendChild(el('h2', {}, 'Leaderboard'));
    const rows = buildLeaderboard(ctx.state.activeSession, leaderboardSort);
    const table = el('table', { 'data-leaderboard': '' });
    const thead = el('thead');
    const headRow = el('tr');
    const cols = [
      ['rank', '#'],
      ['name', 'Name'],
      ['played', 'Played'],
      ['wins', 'W'],
      ['losses', 'L'],
      ['winPct', 'Win %'],
      ['rating', 'Rating'],
    ];
    for (const [key, label] of cols) {
      const th = el(
        'th',
        {
          'data-sort-key': key,
          'data-active': key === leaderboardSort ? 'true' : 'false',
        },
        label,
      );
      if (key !== 'rank') {
        th.addEventListener('click', () => {
          leaderboardSort = key;
          renderLeaderboard();
        });
      }
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const r of rows) {
      const tr = el('tr', { 'data-leaderboard-row': '', 'data-id': r.id });
      tr.appendChild(el('td', {}, String(r.rank)));
      tr.appendChild(el('td', {}, r.name));
      tr.appendChild(el('td', {}, String(r.played)));
      tr.appendChild(el('td', {}, String(r.wins)));
      tr.appendChild(el('td', {}, String(r.losses)));
      tr.appendChild(el('td', {}, formatPct(r.winPct)));
      tr.appendChild(el('td', {}, formatRating(r.rating)));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    leaderboardZone.appendChild(table);
  }

  function playerById(id) {
    return ctx.state.activeSession.players.find((p) => p.id === id);
  }

  function renderCourts() {
    clear(courtsZone);
    const courts = ctx.state.activeSession.courts;
    courts.forEach((court, i) => {
      const card = el('article', { 'data-court': String(i) });
      card.appendChild(el('h2', {}, `Court ${i + 1}`));
      if (!court) {
        card.appendChild(el('p', { 'data-court-status': 'idle' }, 'Waiting for players…'));
      } else {
        const teams = el('div', { 'data-court-teams': '' });
        teams.appendChild(renderTeam('A', court.teamA));
        teams.appendChild(el('span', { 'data-vs': '' }, ' vs '));
        teams.appendChild(renderTeam('B', court.teamB));
        card.appendChild(teams);
        card.appendChild(renderScoreForm(i));
      }
      courtsZone.appendChild(card);
    });
  }

  function renderScoreForm(courtIndex) {
    const form = el('form', {
      'data-action': 'record-score',
      'data-court': String(courtIndex),
    });
    const scoreA = el('input', {
      type: 'number',
      min: '0',
      'data-field': 'score-a',
      required: true,
      placeholder: 'A',
    });
    const scoreB = el('input', {
      type: 'number',
      min: '0',
      'data-field': 'score-b',
      required: true,
      placeholder: 'B',
    });
    const save = el('button', { type: 'submit' }, 'Save score');
    const error = el('span', { 'data-score-error': '' });
    form.appendChild(scoreA);
    form.appendChild(scoreB);
    form.appendChild(save);
    form.appendChild(error);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const a = parseInt(scoreA.value, 10);
      const b = parseInt(scoreB.value, 10);
      if (!validateScore(a, b)) {
        error.textContent = 'Scores must be non-negative integers and not equal.';
        return;
      }
      const next = recordGame(ctx.state.activeSession, courtIndex, a, b, {
        now: ctx.now,
        idGen: ctx.idGen,
      });
      ctx.state.activeSession = fillCourts(next, { rng: ctx.rng });
      ctx.persist();
      refresh();
    });
    return form;
  }

  function renderTeam(label, ids) {
    const team = el('span', { 'data-team': label });
    const names = ids.map((id) => playerById(id)?.name ?? '?');
    team.textContent = names.join(' & ');
    return team;
  }

  function renderQueue() {
    clear(queueZone);
    queueZone.appendChild(el('h2', {}, 'Queue'));
    const list = el('ol', { 'data-queue': '' });
    const queue = ctx.state.activeSession.queue;
    queue.forEach((id, idx) => {
      const player = playerById(id);
      const li = el(
        'li',
        { 'data-queue-item': '', 'data-id': id },
        `${idx + 1}. ${player?.name ?? '?'}`,
      );
      list.appendChild(li);
    });
    queueZone.appendChild(list);

    const playing = countPlaying(ctx.state.activeSession);
    if ((queue.length + playing) % 2 !== 0 && queue.length > 0) {
      queueZone.appendChild(
        el('p', { 'data-queue-note': '' }, '1 player sitting out this round'),
      );
    }
  }

  function renderRosterBar() {
    clear(rosterBar);
    rosterBar.appendChild(el('h2', {}, 'Roster'));

    const addForm = el('form', { 'data-action': 'add-mid-session' });
    const addInput = el('input', {
      type: 'text',
      'data-field': 'add-player-name',
      placeholder: 'Add player to this session',
    });
    const addError = el('span', { 'data-add-error': '' });
    addForm.appendChild(addInput);
    addForm.appendChild(el('button', { type: 'submit' }, 'Add'));
    addForm.appendChild(addError);
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addError.textContent = '';
      const raw = addInput.value;
      const inSession = findExactMatch(raw, ctx.state.activeSession.players);
      if (inSession) {
        addError.textContent = `${inSession.name} is already in this session.`;
        return;
      }
      const inMaster = findExactMatch(raw, ctx.state.master);
      let player;
      if (inMaster) {
        player = { ...inMaster, lastSeen: ctx.now() };
        ctx.state.master = ctx.state.master.map((m) =>
          m.id === inMaster.id ? player : m,
        );
      } else {
        if (!raw.trim()) {
          addError.textContent = 'Enter a name.';
          return;
        }
        player = createPlayer(raw, { now: ctx.now, idGen: ctx.idGen });
        ctx.state.master = addToMaster(ctx.state.master, player);
      }
      const next = addPlayerToSession(ctx.state.activeSession, player);
      ctx.state.activeSession = fillCourts(next, { rng: ctx.rng });
      addInput.value = '';
      ctx.persist();
      refresh();
    });
    rosterBar.appendChild(addForm);

    const ul = el('ul', { 'data-roster-bar': '' });
    for (const p of ctx.state.activeSession.players) {
      const status = playerStatus(ctx.state.activeSession, p.id);
      const li = el(
        'li',
        { 'data-roster-bar-item': '', 'data-id': p.id, 'data-status': status },
      );
      li.appendChild(document.createTextNode(`${p.name} — ${status} `));
      const remove = el(
        'button',
        { 'data-action': 'remove-from-session', 'data-id': p.id, type: 'button' },
        'Remove',
      );
      remove.addEventListener('click', () => {
        if (status === 'playing') {
          // Confirm before interrupting an in-progress game.
          const ok = globalThis.confirm
            ? globalThis.confirm(`${p.name} is playing — end the game and remove them?`)
            : true;
          if (!ok) return;
        }
        const next = removeSessionPlayer(ctx.state.activeSession, p.id);
        ctx.state.activeSession = fillCourts(next, { rng: ctx.rng });
        ctx.persist();
        refresh();
      });
      li.appendChild(remove);
      ul.appendChild(li);
    }
    rosterBar.appendChild(ul);
  }

  refresh();
  root.appendChild(screen);
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

function formatRating(value) {
  // One decimal if non-integer, else whole number.
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function countPlaying(session) {
  let n = 0;
  for (const c of session.courts) if (c) n += 4;
  return n;
}

function playerStatus(session, id) {
  for (const c of session.courts) {
    if (!c) continue;
    if (c.teamA.includes(id) || c.teamB.includes(id)) return 'playing';
  }
  if (session.queue.includes(id)) return 'waiting';
  return 'sitting out';
}
