// History screen — list of archived sessions, with a detail view per
// session showing the final leaderboard and the game log. Sessions are
// never auto-deleted; "Clear history" lives elsewhere (settings).

import { buildLeaderboard } from '../../logic/leaderboard.js';
import { el, clear } from '../dom.js';

export function renderHistory(root, ctx) {
  clear(root);
  const screen = el('section', { 'data-screen': 'history' });

  const back = el(
    'button',
    { 'data-action': 'back-to-new-session', type: 'button' },
    'Back',
  );
  back.addEventListener('click', () => {
    ctx.state.viewingSessionId = null;
    ctx.transition(ctx.state.activeSession ? 'session' : 'new-session');
  });
  screen.appendChild(back);
  screen.appendChild(el('h1', {}, 'History'));

  if (ctx.state.viewingSessionId) {
    const session = ctx.state.sessions.find(
      (s) => s.id === ctx.state.viewingSessionId,
    );
    if (session) {
      screen.appendChild(renderDetail(ctx, session));
    } else {
      screen.appendChild(el('p', {}, 'Session not found.'));
    }
  } else {
    screen.appendChild(renderList(ctx));
  }

  root.appendChild(screen);
}

function renderList(ctx) {
  const wrap = el('section', { 'data-zone': 'history-list' });
  if (ctx.state.sessions.length === 0) {
    wrap.appendChild(el('p', {}, 'No past sessions yet.'));
    return wrap;
  }
  const ul = el('ul');
  // Most-recent first.
  const ordered = [...ctx.state.sessions].sort(
    (a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0),
  );
  for (const s of ordered) {
    const li = el('li', { 'data-history-row': '', 'data-id': s.id });
    const date = new Date(s.createdAt).toLocaleDateString();
    const btn = el(
      'button',
      { 'data-action': 'view-session', 'data-id': s.id, type: 'button' },
      `${s.name} — ${date} · ${s.players.length} players · ${(s.games ?? []).length} games`,
    );
    btn.addEventListener('click', () => {
      ctx.state.viewingSessionId = s.id;
      ctx.transition('history');
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}

function renderDetail(ctx, session) {
  const wrap = el('section', { 'data-zone': 'history-detail', 'data-id': session.id });
  wrap.appendChild(el('h2', {}, session.name));
  const date = new Date(session.createdAt).toLocaleString();
  wrap.appendChild(el('p', { 'data-history-meta': '' }, date));

  // Final leaderboard
  wrap.appendChild(el('h3', {}, 'Final leaderboard'));
  const rows = buildLeaderboard(session, 'rating');
  const table = el('table', { 'data-leaderboard': '' });
  const thead = el('thead');
  const headRow = el('tr');
  for (const label of ['#', 'Name', 'Played', 'W', 'L', 'Win %', 'Rating']) {
    headRow.appendChild(el('th', {}, label));
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
    tr.appendChild(el('td', {}, `${Math.round(r.winPct * 100)}%`));
    tr.appendChild(
      el(
        'td',
        {},
        Number.isInteger(r.rating) ? String(r.rating) : r.rating.toFixed(1),
      ),
    );
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);

  // Game log
  wrap.appendChild(el('h3', {}, 'Game log'));
  const log = el('ol', { 'data-game-log': '' });
  for (const g of session.games ?? []) {
    const playerById = new Map(session.players.map((p) => [p.id, p]));
    const teamA = g.teamA.map((id) => playerById.get(id)?.name ?? '?').join(' & ');
    const teamB = g.teamB.map((id) => playerById.get(id)?.name ?? '?').join(' & ');
    log.appendChild(
      el(
        'li',
        { 'data-game': '', 'data-id': g.id },
        `Court ${g.court + 1}: ${teamA} ${g.scoreA} – ${g.scoreB} ${teamB}`,
      ),
    );
  }
  wrap.appendChild(log);
  return wrap;
}
