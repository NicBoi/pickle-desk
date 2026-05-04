// New-session screen. Builds a stable DOM skeleton, then re-renders
// only the suggestions, hint, and roster zones in response to state
// changes — the input field and buttons stay in place so focus is
// preserved while the organiser types.

import { classifyAdd } from '../../logic/duplicates.js';
import { createPlayer, addToMaster } from '../../logic/players.js';
import { startSession } from '../../logic/queue.js';
import { el, clear } from '../dom.js';

export function renderNewSession(root, ctx) {
  clear(root);
  const screen = el('section', { 'data-screen': 'new-session' });

  // ── header ─────────────────────────────────────────────
  const header = el('header');
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
  const nameInput = el('input', {
    type: 'text',
    'data-field': 'session-name',
    value: ctx.state.draft.name,
  });
  nameInput.addEventListener('input', () => {
    ctx.state.draft.name = nameInput.value;
  });
  header.appendChild(labelled('Session name', nameInput));

  const courtsInput = el('input', {
    type: 'number',
    min: '1',
    max: '20',
    'data-field': 'courts',
    value: String(ctx.state.draft.courts),
  });
  courtsInput.addEventListener('input', () => {
    const n = parseInt(courtsInput.value, 10);
    ctx.state.draft.courts = Number.isFinite(n) && n > 0 ? n : 1;
  });
  header.appendChild(labelled('Courts', courtsInput));
  screen.appendChild(header);

  // ── suggestions ────────────────────────────────────────
  const suggestionsZone = el('section', { 'data-zone': 'suggestions' });
  screen.appendChild(suggestionsZone);

  const hiddenZone = el('section', { 'data-zone': 'hidden-players' });
  screen.appendChild(hiddenZone);

  // ── add player ─────────────────────────────────────────
  const addZone = el('section', { 'data-zone': 'add-player' });
  const playerInput = el('input', {
    type: 'text',
    'data-field': 'player-name',
    placeholder: 'Add a new player',
  });
  const addBtn = el('button', { 'data-action': 'add-player', type: 'button' }, 'Add');
  const hintZone = el('div', {
    'data-hint': '',
    'data-kind': 'idle',
    role: 'status',
    'aria-live': 'polite',
  });

  playerInput.addEventListener('input', () => {
    ctx.state.draft.input = playerInput.value;
    refreshHint();
  });
  playerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitAdd();
    }
  });
  addBtn.addEventListener('click', commitAdd);

  addZone.appendChild(playerInput);
  addZone.appendChild(addBtn);
  addZone.appendChild(hintZone);
  screen.appendChild(addZone);

  // ── roster ─────────────────────────────────────────────
  const rosterZone = el('section', { 'data-zone': 'roster' });
  const rosterList = el('ul', { 'data-roster': '' });
  rosterZone.appendChild(rosterList);
  screen.appendChild(rosterZone);

  // ── start ──────────────────────────────────────────────
  const startBtn = el(
    'button',
    { 'data-action': 'start-session', type: 'button' },
    'Start session',
  );
  startBtn.addEventListener('click', () => {
    if (ctx.state.draft.roster.length < ctx.minPlayers) return;
    const session = startSession(ctx.state.draft, {
      now: ctx.now,
      idGen: ctx.idGen,
      rng: ctx.rng,
    });
    ctx.state.activeSession = session;
    ctx.state.draft = {
      name: '', courts: 3, roster: [], input: '', hint: { kind: 'idle' },
    };
    ctx.transition('session');
  });
  screen.appendChild(startBtn);

  // ── handlers / re-render zones ────────────────────────
  function refreshHint() {
    const result = classifyAdd(
      ctx.state.draft.input,
      ctx.state.master,
      ctx.state.draft.roster,
    );
    ctx.state.draft.hint = result;
    hintZone.dataset.kind = result.kind;
    hintZone.textContent = hintMessage(result);
  }

  function commitAdd() {
    const result = ctx.state.draft.hint;
    if (!result || result.kind === 'invalid' || result.kind === 'blocked') return;
    let player;
    if (result.kind === 'returning') {
      player = { ...result.player, hidden: false, lastSeen: ctx.now() };
      ctx.state.master = ctx.state.master.map((p) =>
        p.id === player.id ? player : p,
      );
    } else {
      // 'new' or 'similar' — accept the typed name as a fresh player.
      player = createPlayer(ctx.state.draft.input, {
        now: ctx.now,
        idGen: ctx.idGen,
      });
      ctx.state.master = addToMaster(ctx.state.master, player);
    }
    ctx.state.draft.roster = [...ctx.state.draft.roster, player];
    ctx.state.draft.input = '';
    playerInput.value = '';
    refreshHint();
    refreshSuggestions();
    refreshRoster();
    refreshStartButton();
    ctx.persist();
  }

  function refreshSuggestions() {
    clear(suggestionsZone);
    const candidates = ctx.state.master
      .filter((p) => !p.hidden)
      .filter((p) => !ctx.state.draft.roster.some((r) => r.id === p.id))
      .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
    if (candidates.length > 0) {
      suggestionsZone.appendChild(el('h2', {}, 'Returning players'));
    }
    for (const p of candidates) {
      const wrap = el('span', { 'data-chip-wrap': '' });
      const chip = el(
        'button',
        {
          'data-suggestion-chip': '',
          'data-id': p.id,
          type: 'button',
          'aria-label': `Add ${p.name} to roster`,
        },
        p.name,
      );
      chip.addEventListener('click', () => {
        ctx.state.draft.roster = [
          ...ctx.state.draft.roster,
          { ...p, lastSeen: ctx.now() },
        ];
        ctx.state.master = ctx.state.master.map((m) =>
          m.id === p.id ? { ...m, lastSeen: ctx.now() } : m,
        );
        refreshSuggestions();
        refreshHidden();
        refreshRoster();
        refreshHint();
        refreshStartButton();
        ctx.persist();
      });
      wrap.appendChild(chip);

      const edit = el(
        'button',
        {
          'data-action': 'edit-player',
          'data-id': p.id,
          type: 'button',
          'aria-label': `Rename ${p.name}`,
          title: 'Rename',
        },
        '✏',
      );
      edit.addEventListener('click', () => {
        const next = globalThis.prompt
          ? globalThis.prompt('Rename player', p.name)
          : null;
        if (!next || next.trim() === '' || next.trim() === p.name) return;
        ctx.state.master = ctx.state.master.map((m) =>
          m.id === p.id ? { ...m, name: next.trim() } : m,
        );
        ctx.state.draft.roster = ctx.state.draft.roster.map((r) =>
          r.id === p.id ? { ...r, name: next.trim() } : r,
        );
        refreshSuggestions();
        refreshHidden();
        refreshRoster();
        refreshHint();
        ctx.persist();
      });
      wrap.appendChild(edit);

      const hide = el(
        'button',
        {
          'data-action': 'hide-player',
          'data-id': p.id,
          type: 'button',
          'aria-label': `Hide ${p.name} from suggestions`,
          title: 'Hide from suggestions',
        },
        '🗑',
      );
      hide.addEventListener('click', () => {
        ctx.state.master = ctx.state.master.map((m) =>
          m.id === p.id ? { ...m, hidden: true } : m,
        );
        refreshSuggestions();
        refreshHidden();
        ctx.persist();
      });
      wrap.appendChild(hide);

      suggestionsZone.appendChild(wrap);
    }
  }

  function refreshHidden() {
    clear(hiddenZone);
    const hidden = ctx.state.master.filter((p) => p.hidden);
    if (hidden.length === 0) return;
    const details = el('details');
    const summary = el('summary', {}, `Hidden players (${hidden.length})`);
    details.appendChild(summary);
    const ul = el('ul', { 'data-hidden-list': '' });
    for (const p of hidden) {
      const li = el('li', { 'data-hidden-item': '', 'data-id': p.id });
      li.appendChild(document.createTextNode(p.name + ' '));
      const restore = el(
        'button',
        {
          'data-action': 'restore-player',
          'data-id': p.id,
          type: 'button',
          'aria-label': `Restore ${p.name}`,
        },
        'Restore',
      );
      restore.addEventListener('click', () => {
        ctx.state.master = ctx.state.master.map((m) =>
          m.id === p.id ? { ...m, hidden: false } : m,
        );
        refreshSuggestions();
        refreshHidden();
        ctx.persist();
      });
      li.appendChild(restore);
      ul.appendChild(li);
    }
    details.appendChild(ul);
    hiddenZone.appendChild(details);
  }

  function refreshRoster() {
    clear(rosterList);
    for (const p of ctx.state.draft.roster) {
      const li = el('li', { 'data-roster-item': '', 'data-id': p.id });
      li.appendChild(document.createTextNode(p.name + ' '));
      const remove = el(
        'button',
        { 'data-action': 'remove-from-roster', type: 'button' },
        'Remove',
      );
      remove.addEventListener('click', () => {
        ctx.state.draft.roster = ctx.state.draft.roster.filter(
          (r) => r.id !== p.id,
        );
        refreshSuggestions();
        refreshRoster();
        refreshHint();
        refreshStartButton();
      });
      li.appendChild(remove);
      rosterList.appendChild(li);
    }
  }

  function refreshStartButton() {
    startBtn.disabled = ctx.state.draft.roster.length < ctx.minPlayers;
  }

  refreshSuggestions();
  refreshHidden();
  refreshRoster();
  refreshHint();
  refreshStartButton();

  root.appendChild(screen);
}

function labelled(text, input) {
  const l = document.createElement('label');
  l.appendChild(document.createTextNode(text + ' '));
  l.appendChild(input);
  return l;
}

function hintMessage(result) {
  switch (result.kind) {
    case 'blocked':
      return `${result.player.name} is already in this session.`;
    case 'returning':
      return `Welcome back — ${result.player.name}.`;
    case 'similar':
      return `Did you mean ${result.candidates.map((c) => c.name).join(', ')}? Add anyway.`;
    case 'new':
      return 'New player.';
    default:
      return '';
  }
}
