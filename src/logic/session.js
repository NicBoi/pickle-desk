// Mid-session player transitions and lifecycle (resume / archive /
// new). Pure — no DOM, no localStorage. State in, new state out.
//
// `playerStats` for a removed player is preserved so leaderboard +
// history keep showing what they did before they left.

export function addPlayerToSession(session, player) {
  if (session.players.some((p) => p.id === player.id)) return session;
  return {
    ...session,
    players: [...session.players, player],
    queue: [...session.queue, player.id],
  };
}

export function isSameDay(a, b) {
  if (a == null || b == null) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// Move the active session into the archived sessions list and bump
// lastSeen on every master player who participated. Returns a new
// top-level state object; callers re-assign and persist.
export function archiveSession(state, opts = {}) {
  if (!state.activeSession) return state;
  const now = opts.now ?? Date.now;
  const stamp = now();
  const participantIds = new Set(state.activeSession.players.map((p) => p.id));
  const master = state.master.map((m) =>
    participantIds.has(m.id)
      ? { ...m, lastSeen: Math.max(m.lastSeen ?? 0, stamp) }
      : m,
  );
  const archived = { ...state.activeSession, archivedAt: stamp };
  return {
    ...state,
    master,
    activeSession: null,
    sessions: [...state.sessions, archived],
  };
}

export function removeSessionPlayer(session, playerId) {
  if (!session.players.some((p) => p.id === playerId)) return session;

  let courts = session.courts;
  let queue = session.queue.filter((id) => id !== playerId);

  for (let i = 0; i < session.courts.length; i++) {
    const c = session.courts[i];
    if (!c) continue;
    if (c.teamA.includes(playerId) || c.teamB.includes(playerId)) {
      const remaining = [...c.teamA, ...c.teamB].filter((id) => id !== playerId);
      courts = courts.map((cc, idx) => (idx === i ? null : cc));
      queue = [...queue, ...remaining];
      break;
    }
  }

  return {
    ...session,
    players: session.players.filter((p) => p.id !== playerId),
    courts,
    queue,
  };
}
